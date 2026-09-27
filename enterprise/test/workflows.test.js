'use strict';
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const cds = require('@sap/cds');
const { SELECT, INSERT, DELETE } = cds.ql;
const { releaseOrder } = require('../srv/lib/order-workflow');
const { ingestMonitoringEvent, acknowledgeIncident } = require('../srv/lib/monitoring');
const { deliverBatch } = require('../srv/lib/outbox');
let db, service;
const ids = { customer:'11111111-1111-4111-8111-111111111111', order:'22222222-2222-4222-8222-222222222222', material:'33333333-3333-4333-8333-333333333333', item:'44444444-4444-4444-8444-444444444444' };
const user = (role='Planner', company='1000', id='planner') => new cds.User({ id, roles:[role], attr:{companyCode:company} });
const command = (extra={}) => ({orderID:ids.order,requestID:'request-0001',expectedRevision:0,...extra});
const row = (name,where) => db.run(SELECT.one.from(`enterprise.${name}`).where(where));
const count = async name => (await db.run(SELECT.from(`enterprise.${name}`))).length;
const release = (actor=user(),data=command()) => db.tx(tx => releaseOrder(tx,actor,data));
before(async () => { const model=await cds.load(['db','srv']); db=await cds.deploy(model).to('sqlite::memory:'); service=(await cds.serve('all').from(model)).ControlTower; });
after(async () => { await db.disconnect(); });
beforeEach(async () => {
 for (const name of ['JournalLines','JournalEntries','DeadLetters','Commands','Reservations','CreditDecisions','IntegrationEvents','AuditEvents','MonitoringEvents','Incidents','SalesOrderItems','SalesOrders','Stock','BusinessPartners','Materials']) await db.run(DELETE.from(`enterprise.${name}`));
 await db.run(INSERT.into('enterprise.BusinessPartners').entries({ID:ids.customer,name:'Sample customer',companyCode:'1000',blocked:false,creditLimit:500,exposure:100}));
 await db.run(INSERT.into('enterprise.Materials').entries({ID:ids.material,sku:'PUMP-100',unit:'EA'}));
 await db.run(INSERT.into('enterprise.SalesOrders').entries({ID:ids.order,companyCode:'1000',customer_ID:ids.customer,status:'DRAFT',total:120,revision:0}));
 await db.run(INSERT.into('enterprise.SalesOrderItems').entries({ID:ids.item,order_ID:ids.order,material_ID:ids.material,plantCode:'1100',quantity:3,unitPrice:40}));
 await db.run(INSERT.into('enterprise.Stock').entries({material_ID:ids.material,plantCode:'1100',companyCode:'1000',available:10,reserved:0,revision:0}));
});
test('release atomically reserves credit, inventory, audit and integration event',async () => {
 assert.equal((await release()).status,'RELEASED');
 assert.equal((await row('Stock',{material_ID:ids.material})).available,7);
 assert.equal(Number((await row('BusinessPartners',{ID:ids.customer})).exposure),220);
 for (const name of ['Reservations','CreditDecisions','IntegrationEvents','AuditEvents','Commands']) assert.equal(await count(name),1,name);
});
test('idempotent retry does not reserve or publish twice',async () => {
 const first=await release();assert.deepEqual(await release(),first);
 assert.equal(await count('IntegrationEvents'),1);assert.equal((await row('Stock',{material_ID:ids.material})).available,7);
});
test('same idempotency key cannot be replayed by another actor',async () => {
 await release();await assert.rejects(release(user('Planner','1000','other')), {statusCode:409});
});
test('wrong role is rejected before writes',async () => {
 await assert.rejects(release(user('Viewer')), {statusCode:403});assert.equal(await count('Commands'),0);
});
test('cross-company release is denied',async () => {
 await assert.rejects(release(user('Planner','2000')), {statusCode:403});assert.equal((await row('SalesOrders',{ID:ids.order})).status,'DRAFT');
});
test('stale revision is rejected',async () => { await assert.rejects(release(user(),command({expectedRevision:4})),{statusCode:409}); });
test('missing order is explicit',async () => { await assert.rejects(release(user(),command({orderID:cds.utils.uuid()})),{statusCode:404}); });
test('invalid quantity is rejected',async () => {
 await db.run(cds.ql.UPDATE('enterprise.SalesOrderItems').set({quantity:-1}).where({ID:ids.item}));
 await assert.rejects(release(),{statusCode:422});
});
test('credit breach rolls back the order state',async () => {
 await db.run(cds.ql.UPDATE('enterprise.BusinessPartners').set({creditLimit:200}).where({ID:ids.customer}));
 await assert.rejects(release(),{statusCode:422});assert.equal((await row('SalesOrders',{ID:ids.order})).status,'DRAFT');
 assert.equal((await row('Stock',{material_ID:ids.material})).available,10);
});
test('stock failure rolls back credit and status',async () => {
 await db.run(cds.ql.UPDATE('enterprise.Stock').set({available:1}).where({material_ID:ids.material}));
 await assert.rejects(release(),{statusCode:409});
 assert.equal(Number((await row('BusinessPartners',{ID:ids.customer})).exposure),100);
 assert.equal((await row('SalesOrders',{ID:ids.order})).status,'DRAFT');assert.equal(await count('IntegrationEvents'),0);
});
test('later line failure rolls back earlier reservation',async () => {
 await db.run(INSERT.into('enterprise.SalesOrderItems').entries({ID:cds.utils.uuid(),order_ID:ids.order,material_ID:'ffffffff-ffff-4fff-8fff-ffffffffffff',plantCode:'1100',quantity:2,unitPrice:10}));
 await assert.rejects(release(),{statusCode:409});assert.equal((await row('Stock',{material_ID:ids.material})).available,10);assert.equal(await count('Reservations'),0);
});
const event = () => ({eventID:'calm:event:001',companyCode:'1000',service:'order-fulfillment',severity:'CRITICAL',summary:'Queue age exceeded',correlationID:'flow-001'});
test('Cloud ALM normalized event is deduplicated and can be acknowledged',async () => {
 const actor=user('Operator');const first=await db.tx(tx=>ingestMonitoringEvent(tx,actor,event()));
 assert.equal(await db.tx(tx=>ingestMonitoringEvent(tx,actor,event())),first);assert.equal(await count('Incidents'),1);
 assert.equal(await db.tx(tx=>acknowledgeIncident(tx,actor,first)),true);
 assert.equal((await row('Incidents',{ID:first})).status,'ACKNOWLEDGED');assert.equal(await count('AuditEvents'),1);
});
test('monitoring rejects invalid severity and another company',async () => {
 await assert.rejects(db.tx(tx=>ingestMonitoringEvent(tx,user('Operator'),{...event(),severity:'UNKNOWN'})),{statusCode:400});
 await assert.rejects(db.tx(tx=>ingestMonitoringEvent(tx,user('Operator','2000'),event())),{statusCode:403});
});
test('outbox delivery preserves event ID for deduplication',async () => {
 await release();let received;
 assert.equal(await deliverBatch(db,async event=>{received=event;}),1);
 assert.equal(received.type,'enterprise.order.released.v1');assert.ok(received.id);
 assert.equal(await deliverBatch(db,async()=>assert.fail('already delivered')),0);
});
test('failed delivery backs off and dead-letters after retry budget',async () => {
 await release();const fail=async()=>{throw new Error('Transport unavailable');};
 await deliverBatch(db,fail,{maxAttempts:2,now:new Date('2030-01-01T00:00:00Z')});
 const first=await row('IntegrationEvents',{status:'PENDING'});assert.equal(first.attempts,1);
 await deliverBatch(db,fail,{maxAttempts:2,now:new Date('2030-01-01T00:00:01Z')});assert.equal((await row('IntegrationEvents',{ID:first.ID})).attempts,1);
 await deliverBatch(db,fail,{maxAttempts:2,now:new Date('2030-01-01T00:01:00Z')});assert.equal((await row('IntegrationEvents',{ID:first.ID})).status,'DEAD');assert.equal(await count('DeadLetters'),1);
});

const {cents,postJournal}=require('../srv/lib/finance');
test('money calculations use exact minor units',()=> {
 assert.equal(cents('9999999999999.99'),999999999999999n);
 assert.equal(cents('0.10')+cents('0.20'),cents('0.30'));
 assert.throws(()=>cents('1.001'),{statusCode:422});
 assert.throws(()=>cents('-1'),{statusCode:422});
});
async function journal(credit='120.00') {
 const ID=cds.utils.uuid();
 await db.run(INSERT.into('enterprise.JournalEntries').entries({ID,companyCode:'1000',fiscalYear:2026,postingDate:'2026-09-26',status:'DRAFT'}));
 await db.run(INSERT.into('enterprise.JournalLines').entries([
  {ID:cds.utils.uuid(),entry_ID:ID,account:'110000',debit:'120.00',credit:'0.00',currency:'EUR'},
  {ID:cds.utils.uuid(),entry_ID:ID,account:'400000',debit:'0.00',credit,currency:'EUR'}
 ]));return ID;
}
test('balanced journal posts once with audit evidence',async()=>{
 const ID=await journal();assert.equal(await db.tx(tx=>postJournal(tx,user('Accountant'),ID)),true);
 assert.equal((await row('JournalEntries',{ID})).status,'POSTED');assert.equal(await count('AuditEvents'),1);
 await assert.rejects(db.tx(tx=>postJournal(tx,user('Accountant'),ID)),{statusCode:409});
});
test('unbalanced journal cannot post',async()=>{
 const ID=await journal('119.99');await assert.rejects(db.tx(tx=>postJournal(tx,user('Accountant'),ID)),{statusCode:422});
 assert.equal((await row('JournalEntries',{ID})).status,'DRAFT');assert.equal(await count('AuditEvents'),0);
});
test('journal posting enforces role and company',async()=>{
 const ID=await journal();
 await assert.rejects(db.tx(tx=>postJournal(tx,user('Planner'),ID)),{statusCode:403});
 await assert.rejects(db.tx(tx=>postJournal(tx,user('Accountant','2000'),ID)),{statusCode:403});
});
test('stock owned by another company cannot be reserved',async()=>{
 await db.run(cds.ql.UPDATE('enterprise.Stock').set({companyCode:'2000'}).where({material_ID:ids.material}));
 await assert.rejects(release(),{statusCode:409});assert.equal((await row('Stock',{material_ID:ids.material})).available,10);
});

test('CAP service dispatch reaches the transactional order handler',async()=>{
 const response=await service.tx({user:user()},tx=>tx.send('releaseOrder',command()));
 assert.equal(response.status,'RELEASED');assert.equal(await count('IntegrationEvents'),1);
});
test('CAP service authorization rejects a viewer invoking release',async()=>{
 await assert.rejects(service.tx({user:user('Viewer')},tx=>tx.send('releaseOrder',command())),error=>Number(error.code ?? error.statusCode)===403);
});
test('CAP read restriction hides another company order',async()=>{
 const other=cds.utils.uuid();await db.run(INSERT.into('enterprise.SalesOrders').entries({ID:other,companyCode:'2000',status:'DRAFT',total:10,revision:0}));
 const orders=await service.tx({user:user('Viewer')},tx=>tx.run(SELECT.from(service.entities.Orders)));
 assert.equal(orders.length,1);assert.equal(orders[0].ID,ids.order);
});
test('XSUAA-style company attribute arrays are accepted only for assigned companies',async()=>{
 const actor=new cds.User({id:'planner',roles:['Planner'],attr:{companyCode:['1000','3000']}});
 assert.equal((await release(actor)).status,'RELEASED');
});

'use strict';
const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const cds=require('@sap/cds');
const {SELECT,INSERT,DELETE,UPDATE}=cds.ql;
const modules=Object.fromEntries(['sales','procurement','quality','logistics','billing','manufacturing','inventory','master-data','pricing','warehouse','returns'].map(name=>[name,require('../srv/lib/business/'+name)]));
const {releaseOrder}=require('../srv/lib/order-workflow');const {postJournal}=require('../srv/lib/finance');
let db,services,sequence;
const ID={customer:'11111111-1111-4111-8111-111111111111',material:'22222222-2222-4222-8222-222222222222',component:'33333333-3333-4333-8333-333333333333',supplier:'44444444-4444-4444-8444-444444444444',vendor:'55555555-5555-4555-8555-555555555555'};
const actor=(role,company='1000',id=role)=>new cds.User({id,roles:[role],attr:{companyCode:company}});
const row=(name,where)=>db.run(SELECT.one.from('enterprise.'+name).where(where));
const rows=name=>db.run(SELECT.from('enterprise.'+name));
const input=(extra={})=>({companyCode:'1000',requestID:`business-command-${++sequence}`,...extra});
const call=(name,role,data,user=actor(role))=>{const fn=Object.values(modules).find(m=>m[name])?.[name]??({releaseOrder,postJournal}[name]);return db.tx(tx=>fn(tx,user,data));};
const orderData=()=>input({customerID:ID.customer,currency:'EUR',requestedDate:'2026-10-01',items:[{materialID:ID.material,plantCode:'1100',quantity:3,unitPrice:'40.00'}]});
const purchaseData=()=>input({supplierID:ID.supplier,currency:'EUR',items:[{materialID:ID.material,plantCode:'1100',quantity:5,unitPrice:'30.00',dueDate:'2026-10-01'}]});
async function released(){const order=await call('createOrder','Planner',orderData());await call('releaseOrder','Planner',{orderID:order.ID,requestID:`release-order-${++sequence}`,expectedRevision:0});return order.ID;}
async function invoice(){const orderID=await released();await call('shipOrder','Warehouse',input({orderID,carrier:'SampleCarrier',trackingNumber:'TRACK-01'}));return call('invoiceOrder','Accountant',input({orderID,dueDate:'2026-10-31'}));}
async function approved(){const order=await call('createPurchaseOrder','Buyer',purchaseData());await call('approvePurchaseOrder','PurchasingManager',input({purchaseOrderID:order.ID}));return {ID:order.ID,item:await row('PurchaseOrderItems',{order_ID:order.ID})};}
async function lot(){const po=await approved();return call('receiveGoods','Warehouse',input({purchaseOrderID:po.ID,itemID:po.item.ID,quantity:5,batch:'BATCH-01'}));}
const inspection=(lotID,extra={})=>input({lotID,sampled:5,defective:0,findings:[{characteristic:'pressure',measured:10,lowerBound:9,upperBound:11}],...extra});
const productionData=()=>input({materialID:ID.material,plantCode:'1100',quantity:3,plannedStart:'2026-10-01T08:00:00Z',plannedEnd:'2026-10-01T10:00:00Z'});
before(async()=>{const model=await cds.load(['db','srv']);db=await cds.deploy(model).to('sqlite::memory:');services=await cds.serve('all').from(model);});
after(async()=>db.disconnect());
beforeEach(async()=>{
 sequence=0;
 for(const [name,def] of Object.entries(db.model.definitions))if(name.startsWith('enterprise.')&&def.kind==='entity'&&!def.query)await db.run(DELETE.from(name));
 const seed=async(name,data)=>db.run(INSERT.into('enterprise.'+name).entries(data));
 await seed('Companies',[{code:'1000',currency:'EUR'},{code:'2000',currency:'EUR'}]);
 await seed('Plants',[{code:'1100',company_code:'1000'},{code:'1200',company_code:'1000'},{code:'2100',company_code:'2000'}]);
 await seed('BusinessPartners',[{ID:ID.customer,name:'Customer',companyCode:'1000',country:'DE',blocked:false,creditLimit:10000,exposure:0},{ID:ID.vendor,name:'Vendor',companyCode:'1000',country:'DE',blocked:false,creditLimit:0,exposure:0}]);
 await seed('Materials',[{ID:ID.material,sku:'PUMP',unit:'EA'},{ID:ID.component,sku:'VALVE',unit:'EA'}]);
 await seed('Suppliers',{ID:ID.supplier,partner_ID:ID.vendor,purchasingOrg:'1000',blocked:false,rating:95});
 await seed('Stock',[{material_ID:ID.material,plantCode:'1100',companyCode:'1000',available:100,reserved:0,revision:0},{material_ID:ID.component,plantCode:'1100',companyCode:'1000',available:100,reserved:0,revision:0}]);
 await seed('TaxPolicies',{country:'DE',currency:'EUR',rateBasisPoints:1900,effectiveFrom:'2026-01-01'});
 await seed('QualityPolicies',{material_ID:ID.material,companyCode:'1000',maxDefectBasisPoints:100});
 await seed('BillsOfMaterial',{ID:cds.utils.uuid(),parent_ID:ID.material,component_ID:ID.component,quantity:2,validFrom:'2026-01-01',validTo:'2026-12-31'});
});
test('order-to-cash reconciles invoice, tax, journal, partial payments, stock and credit',async()=>{
 const bill=await invoice();assert.equal(bill.netAmount,'120.00');assert.equal(bill.taxAmount,'22.80');
 assert.equal(await call('postJournal','Accountant',bill.journalID),true);
 assert.equal((await call('settlePayment','Accountant',input({invoiceID:bill.ID,amount:'50.00',currency:'EUR',bankReference:'BANK-1'}))).status,'OPEN');
 assert.equal(Number((await row('BusinessPartners',{ID:ID.customer})).exposure),120);
 assert.equal((await call('settlePayment','Accountant',input({invoiceID:bill.ID,amount:'92.80',currency:'EUR',bankReference:'BANK-2'}))).status,'PAID');
 assert.equal(Number((await row('BusinessPartners',{ID:ID.customer})).exposure),0);
 const stock=await row('Stock',{material_ID:ID.material,plantCode:'1100'});assert.equal(stock.available,97);assert.equal(stock.reserved,0);
 assert.equal((await rows('Payments')).length,2);assert.equal((await rows('JournalLines')).length,3);
});
test('idempotent request returns its result and rejects payload or actor changes',async()=>{
 const data=orderData(),first=await call('createOrder','Planner',data);assert.deepEqual(await call('createOrder','Planner',data),first);
 await assert.rejects(call('createOrder','Planner',{...data,currency:'USD'}),{statusCode:409});
 await assert.rejects(call('createOrder','Planner',data,actor('Planner','1000','other')),{statusCode:409});
 assert.equal((await rows('SalesOrders')).length,1);assert.equal((await rows('IntegrationEvents')).length,1);
});
test('all business actions reject an unauthorized role without writing commands',async()=>{
 for(const group of Object.values(modules))for(const fn of Object.values(group))await assert.rejects(db.tx(tx=>fn(tx,actor('Viewer'),input())),{statusCode:403});
 assert.equal((await rows('BusinessCommands')).length,0);
});
test('order validation rejects missing lines and cross-company customer or plant',async()=>{
 await assert.rejects(call('createOrder','Planner',orderData(),actor('Planner','2000')),{statusCode:403});
 await assert.rejects(call('createOrder','Planner',{...orderData(),items:[]}),{statusCode:422});
 await assert.rejects(call('createOrder','Planner',{...orderData(),items:[{materialID:ID.material,plantCode:'2100',quantity:1,unitPrice:'1'}]}),{statusCode:422});
 assert.equal((await rows('BusinessCommands')).length,0);
});
test('cancellation restores reservations and credit exactly once',async()=>{
 const orderID=await released();await assert.rejects(call('cancelOrder','Planner',input({orderID,expectedRevision:0})),{statusCode:409});
 const result=await call('cancelOrder','Planner',input({orderID,expectedRevision:1}));assert.equal(result.status,'CANCELLED');
 const stock=await row('Stock',{material_ID:ID.material,plantCode:'1100'});assert.equal(stock.available,100);assert.equal(stock.reserved,0);
 assert.equal(Number((await row('BusinessPartners',{ID:ID.customer})).exposure),0);
 await assert.rejects(call('cancelOrder','Planner',input({orderID,expectedRevision:2})),{statusCode:409});
});
test('shipping rejects corrupt reservations and preserves order state',async()=>{
 const orderID=await released();await db.run(UPDATE('enterprise.Reservations').set({quantity:2}).where({order_ID:orderID}));
 await assert.rejects(call('shipOrder','Warehouse',input({orderID,carrier:'C',trackingNumber:'T'})),{statusCode:409});
 assert.equal((await row('SalesOrders',{ID:orderID})).status,'RELEASED');assert.equal((await rows('Deliveries')).length,0);
});
test('invoice cannot duplicate and payment cannot exceed the balance',async()=>{
 const bill=await invoice(),stored=await row('Invoices',{ID:bill.ID});
 await assert.rejects(call('invoiceOrder','Accountant',input({orderID:stored.order_ID,dueDate:'2026-10-31'})),{statusCode:409});
 await assert.rejects(call('settlePayment','Accountant',input({invoiceID:bill.ID,amount:'142.81',currency:'EUR',bankReference:'B'})),{statusCode:422});
 assert.equal((await rows('Payments')).length,0);
});
test('purchase-to-stock requires receipt and accepted quality inspection',async()=>{
 const received=await lot();assert.equal((await row('Stock',{material_ID:ID.material,plantCode:'1100'})).available,100);
 assert.equal((await call('inspectLot','QualityInspector',inspection(received.inspectionID))).status,'ACCEPTED');
 assert.equal((await row('Stock',{material_ID:ID.material,plantCode:'1100'})).available,105);
});
test('purchase creator cannot approve the same order',async()=>{
 const po=await call('createPurchaseOrder','Buyer',purchaseData());
 await assert.rejects(call('approvePurchaseOrder','PurchasingManager',input({purchaseOrderID:po.ID}),actor('PurchasingManager','1000','Buyer')),{statusCode:403});
 assert.equal((await row('PurchaseOrders',{ID:po.ID})).status,'DRAFT');
});
test('partial receipts reconcile and over-receipts roll back',async()=>{
 const po=await approved(),data=input({purchaseOrderID:po.ID,itemID:po.item.ID,quantity:3,batch:'B'});
 assert.equal((await call('receiveGoods','Warehouse',data)).status,'PARTIALLY_RECEIVED');
 await assert.rejects(call('receiveGoods','Warehouse',{...data,requestID:'excess-receipt'}),{statusCode:409});
 assert.equal((await row('PurchaseOrderItems',{ID:po.item.ID})).receivedQuantity,3);
 assert.equal((await call('receiveGoods','Warehouse',{...data,requestID:'final-receipt',quantity:2})).status,'RECEIVED');
});
test('failed inspection quarantines goods and repeated inspection is rejected',async()=>{
 const received=await lot();await assert.rejects(call('inspectLot','QualityInspector',inspection(received.inspectionID,{sampled:6})),{statusCode:422});
 const result=await call('inspectLot','QualityInspector',inspection(received.inspectionID,{findings:[{characteristic:'pressure',measured:8,lowerBound:9,upperBound:11}]}));assert.equal(result.status,'REJECTED');
 assert.equal((await row('Stock',{material_ID:ID.material,plantCode:'1100'})).available,100);
 await assert.rejects(call('inspectLot','QualityInspector',inspection(received.inspectionID)),{statusCode:409});
});
test('production consumes components and reconciles yield and scrap',async()=>{
 const order=await call('scheduleProduction','ProductionPlanner',productionData());
 assert.equal((await row('Stock',{material_ID:ID.component,plantCode:'1100'})).reserved,6);
 await assert.rejects(call('completeProduction','ProductionPlanner',input({productionID:order.ID,goodQuantity:1,scrapQuantity:1})),{statusCode:422});
 await call('completeProduction','ProductionPlanner',input({productionID:order.ID,goodQuantity:2,scrapQuantity:1}));
 assert.equal((await row('Stock',{material_ID:ID.component,plantCode:'1100'})).reserved,0);
 assert.equal((await row('Stock',{material_ID:ID.material,plantCode:'1100'})).available,102);
});
test('insufficient BOM stock rolls back production and expired BOM is rejected',async()=>{
 await db.run(UPDATE('enterprise.Stock').set({available:2}).where({material_ID:ID.component}));
 await assert.rejects(call('scheduleProduction','ProductionPlanner',productionData()),{statusCode:409});assert.equal((await rows('ProductionOrders')).length,0);
 await assert.rejects(call('scheduleProduction','ProductionPlanner',{...productionData(),plannedStart:'2027-01-01T08:00:00Z',plannedEnd:'2027-01-01T10:00:00Z'}),{statusCode:422});
});
test('stock transfers conserve total quantities and cannot cross company plants',async()=>{
 await call('transferStock','Warehouse',input({materialID:ID.material,fromPlant:'1100',toPlant:'1200',quantity:10}));
 assert.equal((await row('Stock',{material_ID:ID.material,plantCode:'1100'})).available,90);assert.equal((await row('Stock',{material_ID:ID.material,plantCode:'1200'})).available,10);
 await assert.rejects(call('transferStock','Warehouse',input({materialID:ID.material,fromPlant:'1100',toPlant:'2100',quantity:1})),{statusCode:403});
});
test('stock count preserves reservations and detects stale versions',async()=>{
 await released();await assert.rejects(call('countStock','InventoryController',input({materialID:ID.material,plantCode:'1100',countedQuantity:2,expectedRevision:1,reason:'Count'})),{statusCode:422});
 const result=await call('countStock','InventoryController',input({materialID:ID.material,plantCode:'1100',countedQuantity:99,expectedRevision:1,reason:'Damage'}));assert.equal(result.available,96);assert.equal(result.reserved,3);
 await assert.rejects(call('countStock','InventoryController',input({materialID:ID.material,plantCode:'1100',countedQuantity:99,expectedRevision:1,reason:'Again'})),{statusCode:409});
});
test('master data credit limits cannot undercut exposure and blocking stops new orders',async()=>{
 await released();await assert.rejects(call('reviseCreditLimit','CreditManager',input({partnerID:ID.customer,creditLimit:'119.99'})),{statusCode:409});
 await call('blockPartner','MasterDataAdmin',input({partnerID:ID.customer,blocked:true,reason:'Hold'}));await assert.rejects(call('createOrder','Planner',orderData()),{statusCode:422});
 assert.equal((await call('registerPartner','MasterDataAdmin',input({name:'New partner',country:'DE',creditLimit:'500.00'}))).status,'ACTIVE');
});
test('pricing uses exact minor units and rejects ambiguous effective conditions',async()=>{
 const data=input({customerID:ID.customer,materialID:ID.material,currency:'EUR',amount:'0.10',validFrom:'2026-01-01',validTo:'2026-12-31'});await call('maintainPrice','PricingManager',data);
 const quote=await call('quotePrice','Planner',{companyCode:'1000',customerID:ID.customer,materialID:ID.material,currency:'EUR',quantity:3,onDate:'2026-10-01'});assert.equal(quote.total,'0.30');
 await assert.rejects(call('maintainPrice','PricingManager',{...data,requestID:'overlapping-price'}),{statusCode:409});
});
test('only the assigned warehouse operator can confirm a pick',async()=>{
 const orderID=await released(),reservation=await row('Reservations',{order_ID:orderID});
 const task=await call('assignPicking','WarehouseSupervisor',input({reservationID:reservation.ID,sourceBin:'A',targetBin:'DOCK',assignedTo:'picker'}));
 await assert.rejects(call('confirmPicking','Warehouse',input({taskID:task.ID,quantity:3})),{statusCode:403});
 assert.equal((await call('confirmPicking','Warehouse',input({taskID:task.ID,quantity:3}),actor('Warehouse','1000','picker'))).status,'CONFIRMED');
});
test('returns restock only once and cannot exceed fulfilled quantity',async()=>{
 const bill=await invoice(),stored=await row('Invoices',{ID:bill.ID}),item=await row('SalesOrderItems',{order_ID:stored.order_ID});
 const request=await call('authorizeReturn','CustomerService',input({orderID:stored.order_ID,reason:'Wrong item',items:[{itemID:item.ID,quantity:1}]}));assert.equal(request.creditAmount,'47.60');
 await call('receiveReturn','QualityInspector',input({returnID:request.ID,disposition:'RESTOCK'}));assert.equal((await row('Stock',{material_ID:ID.material,plantCode:'1100'})).available,98);assert.equal((await rows('CreditNotes')).length,1);
 await assert.rejects(call('receiveReturn','QualityInspector',input({returnID:request.ID,disposition:'RESTOCK'})),{statusCode:409});
 await assert.rejects(call('authorizeReturn','CustomerService',input({orderID:stored.order_ID,reason:'Excess',items:[{itemID:item.ID,quantity:3}]})),{statusCode:409});
});
test('CAP action dispatch executes the implementation with service authorization',async()=>{
 const result=await services.SalesManagement.tx({user:actor('Planner')},tx=>tx.send({event:'createOrder',data:orderData()}));assert.equal(result.status,'DRAFT');
 await assert.rejects(services.Purchasing.tx({user:actor('Viewer')},tx=>tx.send({event:'createPurchaseOrder',data:purchaseData()})),error=>Number(error.code??error.statusCode)===403);
});
test('a bank transaction cannot be replayed with a different business request',async()=>{
 const bill=await invoice();
 await call('settlePayment','Accountant',input({invoiceID:bill.ID,amount:'1.00',currency:'EUR',bankReference:'BANK-UNIQUE'}));
 await assert.rejects(call('settlePayment','Accountant',input({invoiceID:bill.ID,amount:'1.00',currency:'EUR',bankReference:'BANK-UNIQUE'})),{statusCode:409});
 assert.equal((await rows('Payments')).length,1);
 assert.equal(Number((await row('Invoices',{ID:bill.ID})).paidAmount),1);
});
test('invalid calendar dates and future tax policies cannot issue invoices',async()=>{
 const orderID=await released();await call('shipOrder','Warehouse',input({orderID,carrier:'C',trackingNumber:'T'}));
 await assert.rejects(call('invoiceOrder','Accountant',input({orderID,dueDate:'2026-02-30'})),{statusCode:422});
 await db.run(UPDATE('enterprise.TaxPolicies').set({effectiveFrom:'2099-01-01'}));
 await assert.rejects(call('invoiceOrder','Accountant',input({orderID,dueDate:'2026-10-31'})),{statusCode:422});
 assert.equal((await rows('Invoices')).length,0);
});
test('shipping waits for assigned picking tasks to be confirmed',async()=>{
 const orderID=await released(),reservation=await row('Reservations',{order_ID:orderID});
 const task=await call('assignPicking','WarehouseSupervisor',input({reservationID:reservation.ID,sourceBin:'A',targetBin:'D',assignedTo:'picker'}));
 await assert.rejects(call('shipOrder','Warehouse',input({orderID,carrier:'C',trackingNumber:'T'})),{statusCode:409});
 await call('confirmPicking','Warehouse',input({taskID:task.ID,quantity:3}),actor('Warehouse','1000','picker'));
 assert.equal((await call('shipOrder','Warehouse',input({orderID,carrier:'C',trackingNumber:'T'}))).status,'SHIPPED');
});
test('partial returns conserve the original invoice tax down to the last cent',async()=>{
 const order=await call('createOrder','Planner',{...orderData(),items:[{materialID:ID.material,plantCode:'1100',quantity:3,unitPrice:'0.01'}]});
 await call('releaseOrder','Planner',{orderID:order.ID,requestID:'release-small-order',expectedRevision:0});
 await call('shipOrder','Warehouse',input({orderID:order.ID,carrier:'C',trackingNumber:'T'}));
 const bill=await call('invoiceOrder','Accountant',input({orderID:order.ID,dueDate:'2026-10-31'}));
 const item=await row('SalesOrderItems',{order_ID:order.ID});let credits=0;
 for(let i=0;i<3;i++){
  const ret=await call('authorizeReturn','CustomerService',input({orderID:order.ID,reason:'Partial return',items:[{itemID:item.ID,quantity:1}]}));
  credits+=Math.round(Number(ret.creditAmount)*100);
 }
 assert.equal(credits,4);
 const stored=await row('Invoices',{ID:bill.ID});assert.equal(Number(stored.creditedNetAmount),0.03);assert.equal(Number(stored.creditedTaxAmount),0.01);
});

const {readFileSync}=require('node:fs');
const {createHmac}=require('node:crypto');
const {receive:receiveIntegration}=require('../integration/runtime/inbound');
const signingKey='unit-test-signing-key-not-a-deployment-secret';
const integrationNow=Date.parse('2026-09-26T12:00:00Z');
const technicalUser=()=>new cds.User({id:'integration-worker',roles:['IntegrationOperator','Planner','Warehouse','Accountant'],attr:{companyCode:'1000'}});
function envelope(channel,file,change={}) {
 const data={companyCode:'1000',sourceSystem:'ECC_DEV',channel,payload:readFileSync(require('node:path').join(__dirname,'../integration/fixtures',file),'utf8'),timestamp:String(integrationNow/1000),...change};
 data.signature=createHmac('sha256',signingKey).update(`${data.timestamp}\n${data.companyCode}\n${data.channel}\n${data.sourceSystem}\n${data.payload}`).digest('hex');
 return data;
}
async function mappings() {
 await db.run(INSERT.into('enterprise.ExternalIdentifiers').entries([
  {companyCode:'1000',sourceSystem:'ECC_DEV',objectType:'customer',externalID:'C10001',internalID:ID.customer},
  {companyCode:'1000',sourceSystem:'ECC_DEV',objectType:'material',externalID:'PUMP-100',internalID:ID.material}
 ]));
}
const inbound=(message,user=technicalUser())=>db.tx(tx=>receiveIntegration(tx,user,message,{secret:signingKey,now:integrationNow}));
test('IDoc to SOAP delivery to CloudEvent payment completes a reconciled business flow',async()=>{
 await mappings();const order=await inbound(envelope('idoc','orders05.xml'));
 assert.equal(order.status,'DRAFT');assert.equal(order.externalID,'0000000000001001');
 await call('releaseOrder','Planner',{orderID:order.ID,requestID:'release-idoc-order',expectedRevision:0});
 const shipped=await inbound(envelope('soap','delivery.xml'));assert.equal(shipped.status,'SHIPPED');
 const bill=await call('invoiceOrder','Accountant',input({orderID:order.ID,dueDate:'2026-10-31'}));
 await db.run(INSERT.into('enterprise.ExternalIdentifiers').entries({companyCode:'1000',sourceSystem:'ECC_DEV',objectType:'invoice',externalID:'INV-1001',internalID:bill.ID}));
 const payment=await inbound(envelope('eventmesh','payment.json'));assert.equal(payment.status,'PAID');
 assert.equal(Number((await row('BusinessPartners',{ID:ID.customer})).exposure),0);
 assert.equal((await rows('SalesOrders')).length,1);assert.equal((await rows('Deliveries')).length,1);assert.equal((await rows('Payments')).length,1);
});
test('IDoc duplicate replay is idempotent while changed payload reusing DOCNUM is rejected',async()=>{
 await mappings();const original=envelope('idoc','orders05.xml'),first=await inbound(original);
 assert.deepEqual(await inbound(original),first);
 await assert.rejects(inbound(envelope('idoc','orders05.xml',{payload:original.payload.replace('40.00','41.00')})),{statusCode:409});
 assert.equal((await rows('SalesOrders')).length,1);
});
test('integration signature binds payload source system company and channel',async()=>{
 await mappings();const original=envelope('idoc','orders05.xml');
 for(const change of [{payload:original.payload+' '},{sourceSystem:'OTHER'},{channel:'soap'},{signature:'0'.repeat(64)}])await assert.rejects(inbound({...original,...change}),{statusCode:401});
 assert.equal((await rows('SalesOrders')).length,0);
});
test('integration rejects expired signatures unauthorized actors and cross-company payloads',async()=>{
 await assert.rejects(inbound(envelope('idoc','orders05.xml',{timestamp:String(integrationNow/1000-301)})),{statusCode:401});
 await assert.rejects(inbound(envelope('idoc','orders05.xml'),actor('Planner')),{statusCode:403});
 await assert.rejects(inbound(envelope('idoc','orders05.xml',{companyCode:'2000'})),{statusCode:403});
 await assert.rejects(inbound(envelope('idoc','orders05.xml',{payload:envelope('idoc','orders05.xml').payload.replace('<BUKRS>1000</BUKRS>','<BUKRS>2000</BUKRS>')})),{statusCode:403});
});
test('integration refuses missing mappings and unsupported IDoc units without partial orders',async()=>{
 await assert.rejects(inbound(envelope('idoc','orders05.xml')),{statusCode:422});await mappings();
 await assert.rejects(inbound(envelope('idoc','orders05.xml',{payload:envelope('idoc','orders05.xml').payload.replace('<MENEE>EA</MENEE>','<MENEE>KG</MENEE>')})),{statusCode:422});
 assert.equal((await rows('SalesOrders')).length,0);assert.equal((await rows('BusinessCommands')).length,0);
});
test('XML DTD declarations and duplicate document identities cannot enter business logic',async()=>{
 await mappings();
 await assert.rejects(inbound(envelope('idoc','orders05.xml',{payload:'<!DOCTYPE ORDERS05 [<!ENTITY x SYSTEM "file:///etc/passwd">]>'+envelope('idoc','orders05.xml').payload})),{statusCode:422});
 const original=envelope('idoc','orders05.xml').payload;
 await assert.rejects(inbound(envelope('idoc','orders05.xml',{payload:original.replace('<DOCNUM>','<DOCNUM>1</DOCNUM><DOCNUM>')})),{statusCode:422});
 assert.equal((await rows('SalesOrders')).length,0);
});
test('integration principal also needs the business action role',async()=>{
 await mappings();const integrationOnly=new cds.User({id:'restricted-worker',roles:['IntegrationOperator'],attr:{companyCode:'1000'}});
 await assert.rejects(inbound(envelope('idoc','orders05.xml'),integrationOnly),{statusCode:403});
});
test('message size and signing-key configuration are enforced before parsing',async()=>{
 await assert.rejects(inbound(envelope('idoc','orders05.xml',{payload:'x'.repeat(1048577)})),{statusCode:413});
 await assert.rejects(db.tx(tx=>receiveIntegration(tx,technicalUser(),envelope('idoc','orders05.xml'),{secret:'short',now:integrationNow})),{statusCode:503});
});

const {deliverBatch}=require('../srv/lib/outbox');
async function event(extra={}) {
 const value={ID:cds.utils.uuid(),companyCode:'1000',topic:'enterprise.test.v1',payload:'{"companyCode":"1000"}',status:'PENDING',attempts:0,...extra};
 await db.run(INSERT.into('enterprise.IntegrationEvents').entries(value));return value;
}
test('outbox skips delayed rows before applying batch limits',async()=>{
 const now=new Date('2026-09-26T12:00:00Z');
 await event({nextAttemptAt:'2026-09-27T12:00:00Z'});const due=await event();const sent=[];
 assert.equal(await deliverBatch(db,async message=>sent.push(message.id),{limit:1,now}),1);assert.deepEqual(sent,[due.ID]);
});
test('outbox lease prevents concurrent delivery of the same pending event',async()=>{
 await event();let release,started;
 const held=new Promise(resolve=>{release=resolve;}),entered=new Promise(resolve=>{started=resolve;});
 let calls=0;const first=deliverBatch(db,async()=>{calls++;started();await held;});
 await entered;assert.equal(await deliverBatch(db,async()=>{calls++;}),0);release();assert.equal(await first,1);assert.equal(calls,1);
});
test('outbox recovers expired leases but never spends beyond retry budget',async()=>{
 const now=new Date('2026-09-26T12:00:00Z');
 const expired=await event({status:'PROCESSING',attempts:1,leaseToken:cds.utils.uuid(),leaseExpiresAt:'2026-09-26T11:59:00Z'});
 assert.equal(await deliverBatch(db,async()=>{}, {now,maxAttempts:3}),1);assert.equal((await row('IntegrationEvents',{ID:expired.ID})).attempts,2);
 const exhausted=await event({status:'PROCESSING',attempts:3,leaseToken:cds.utils.uuid(),leaseExpiresAt:'2026-09-26T11:59:00Z'});
 let called=false;assert.equal(await deliverBatch(db,async()=>{called=true;},{now,maxAttempts:3}),0);assert.equal(called,false);
 assert.equal((await row('IntegrationEvents',{ID:exhausted.ID})).status,'DEAD');assert.equal((await rows('DeadLetters')).length,1);
});
test('stale outbox owner cannot acknowledge a replacement lease',async()=>{
 const queued=await event(),replacement=cds.utils.uuid();
 assert.equal(await deliverBatch(db,async()=>{await db.run(UPDATE('enterprise.IntegrationEvents').set({leaseToken:replacement}).where({ID:queued.ID}));}),0);
 const state=await row('IntegrationEvents',{ID:queued.ID});assert.equal(state.status,'PROCESSING');assert.equal(state.leaseToken,replacement);
});

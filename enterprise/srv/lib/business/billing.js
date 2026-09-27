'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {cents}=require('../finance');
const {isoDate}=require('./validation');
const {entity:E,owned,transition,command,money}=require('./transaction');
async function invoiceOrder(tx,user,data) {
 return command(tx,user,'Accountant','ORDER_INVOICED',data,async()=>{
  const order=await owned(tx,'SalesOrders',data.orderID,data.companyCode);
  const customer=await owned(tx,'BusinessPartners',order.customer_ID,data.companyCode);
  const policy=await tx.run(SELECT.one.from(E('TaxPolicies')).where({country:customer.country,currency:order.currency}));
  if(!policy||!Number.isInteger(policy.rateBasisPoints)||policy.rateBasisPoints<0||policy.rateBasisPoints>10000)reject(422,'Valid tax policy is required');
  isoDate(data.dueDate,'Invoice due date');
  if(!policy.effectiveFrom||policy.effectiveFrom>new Date().toISOString().slice(0,10))reject(422,'Tax policy is not effective');
  const net=cents(order.total),tax=(net*BigInt(policy.rateBasisPoints)+5000n)/10000n;
  await transition(tx,'SalesOrders',order,['SHIPPED'],'INVOICED',{revision:order.revision+1});
  const ID=cds.utils.uuid();
  await tx.run(INSERT.into(E('Invoices')).entries({ID,order_ID:order.ID,companyCode:data.companyCode,fiscalYear:Number(data.dueDate.slice(0,4)),currency:order.currency,netAmount:money(net),taxAmount:money(tax),paidAmount:'0.00',status:'OPEN',dueDate:data.dueDate}));
  const journalID=cds.utils.uuid();
  await tx.run(INSERT.into(E('JournalEntries')).entries({ID:journalID,companyCode:data.companyCode,fiscalYear:Number(data.dueDate.slice(0,4)),postingDate:new Date().toISOString().slice(0,10),reference:ID,status:'DRAFT'}));
  const lines=[{account:'110000',debit:money(net+tax),credit:'0.00'},{account:'400000',debit:'0.00',credit:money(net)}];
  if(tax>0n)lines.push({account:'220000',debit:'0.00',credit:money(tax)});
  await tx.run(INSERT.into(E('JournalLines')).entries(lines.map(line=>({ID:cds.utils.uuid(),entry_ID:journalID,currency:order.currency,...line}))));
  return {ID,status:'OPEN',netAmount:money(net),taxAmount:money(tax),journalID};
 });
}
async function settlePayment(tx,user,data) {
 return command(tx,user,'Accountant','PAYMENT_RECORDED',data,async()=>{
  const invoice=await owned(tx,'Invoices',data.invoiceID,data.companyCode);
  if(invoice.status!=='OPEN')reject(409,'Invoice is not open');
  const order=await owned(tx,'SalesOrders',invoice.order_ID,data.companyCode);
  if(data.currency!==invoice.currency||typeof data.bankReference!=='string'||!data.bankReference.trim()||data.bankReference.length>80)reject(422,'Payment currency and bank reference are required');
  if(await tx.run(SELECT.one.from(E('Payments')).where({companyCode:data.companyCode,bankReference:data.bankReference})))reject(409,'Bank transaction is already recorded');
  const amount=cents(data.amount);if(!amount)reject(422,'Payment must be positive');
  const total=cents(invoice.netAmount)+cents(invoice.taxAmount),paid=cents(invoice.paidAmount??0),next=paid+amount;
  if(next>total)reject(422,'Payment exceeds outstanding invoice amount');
  const status=next===total?'PAID':'OPEN';
  const changed=await tx.run(UPDATE(E('Invoices')).set({paidAmount:money(next),status}).where({ID:invoice.ID,status:'OPEN',paidAmount:invoice.paidAmount??0}));
  if(changed!==1)reject(409,'Invoice payment changed concurrently');
  const ID=cds.utils.uuid();
  await tx.run(INSERT.into(E('Payments')).entries({ID,companyCode:data.companyCode,invoice_ID:invoice.ID,partner_ID:order.customer_ID,amount:money(amount),currency:data.currency,bankReference:data.bankReference,settledAt:new Date().toISOString()}));
  if(status==='PAID') {
   const released=await tx.run(UPDATE(E('BusinessPartners')).set({exposure:{'-=':order.total}}).where({ID:order.customer_ID,companyCode:data.companyCode}).and('exposure >=',order.total));
   if(released!==1)reject(409,'Customer exposure is inconsistent');
  }
  return {ID,status,paidAmount:money(next),invoiceID:invoice.ID};
 });
}
module.exports={invoiceOrder,settlePayment};

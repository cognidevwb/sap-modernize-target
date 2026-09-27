'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {cents}=require('../finance');
const {entity:E,owned,transition,command,positiveInteger,money}=require('./transaction');
async function authorizeReturn(tx,user,data) {
 return command(tx,user,'CustomerService','RETURN_AUTHORIZED',data,async()=>{
  const order=await owned(tx,'SalesOrders',data.orderID,data.companyCode);
  if(order.status!=='INVOICED'||!data.reason||!Array.isArray(data.items)||!data.items.length)reject(422,'An invoiced order, reason and return lines are required');
  const invoice=await tx.run(SELECT.one.from(E('Invoices')).where({order_ID:order.ID,companyCode:data.companyCode}));if(!invoice)reject(422,'Invoice missing');
  const ID=cds.utils.uuid(),lines=[];let net=0n;
  for(const line of data.items) {
   positiveInteger(line.quantity);
   const item=await tx.run(SELECT.one.from(E('SalesOrderItems')).where({ID:line.itemID,order_ID:order.ID}));if(!item)reject(404,'Order item missing');
   const claimed=await tx.run(UPDATE(E('SalesOrderItems')).set({returnedQuantity:{'+=':line.quantity}}).where({ID:item.ID}).and('returnedQuantity +',line.quantity,'<= quantity'));if(claimed!==1)reject(409,'Return exceeds delivered quantity');
   net+=cents(item.unitPrice)*BigInt(line.quantity);
   lines.push({ID:cds.utils.uuid(),return_ID:ID,orderItem_ID:item.ID,material_ID:item.material_ID,plantCode:item.plantCode,quantity:line.quantity});
  }
  const invoiceNet=cents(invoice.netAmount);if(!invoiceNet)reject(422,'Invoice net value is invalid');
  const previousNet=cents(invoice.creditedNetAmount??0),previousTax=cents(invoice.creditedTaxAmount??0);
  const nextNet=previousNet+net;
  if(nextNet>invoiceNet)reject(409,'Return credit exceeds invoice');
  const nextTax=(nextNet*cents(invoice.taxAmount)+invoiceNet/2n)/invoiceNet;
  const updated=await tx.run(UPDATE(E('Invoices')).set({creditedNetAmount:money(nextNet),creditedTaxAmount:money(nextTax)}).where({ID:invoice.ID,creditedNetAmount:invoice.creditedNetAmount??0,creditedTaxAmount:invoice.creditedTaxAmount??0}));
  if(updated!==1)reject(409,'Invoice returns changed concurrently');
  const credit=net+nextTax-previousTax;
  await tx.run(INSERT.into(E('Returns')).entries({ID,companyCode:data.companyCode,order_ID:order.ID,reason:data.reason,status:'AUTHORIZED',refundAmount:money(credit)}));
  await tx.run(INSERT.into(E('ReturnItems')).entries(lines));return {ID,status:'AUTHORIZED',creditAmount:money(credit)};
 });
}
async function receiveReturn(tx,user,data) {
 return command(tx,user,'QualityInspector','RETURN_RECEIVED',data,async()=>{
  const request=await owned(tx,'Returns',data.returnID,data.companyCode);
  if(!['RESTOCK','SCRAP'].includes(data.disposition))reject(422,'Disposition must be RESTOCK or SCRAP');
  await transition(tx,'Returns',request,['AUTHORIZED'],'RECEIVED',{disposition:data.disposition});
  const lines=await tx.run(SELECT.from(E('ReturnItems')).where({return_ID:request.ID}));if(!lines.length)reject(422,'Return has no lines');
  if(data.disposition==='RESTOCK')for(const line of lines) {
   const key={material_ID:line.material_ID,plantCode:line.plantCode,companyCode:data.companyCode};
   const changed=await tx.run(UPDATE(E('Stock')).set({available:{'+=':line.quantity},revision:{'+=':1}}).where(key));
   if(!changed)await tx.run(INSERT.into(E('Stock')).entries({...key,available:line.quantity,reserved:0,revision:0}));
  }
  await tx.run(INSERT.into(E('CreditNotes')).entries({ID:cds.utils.uuid(),companyCode:data.companyCode,return_ID:request.ID,amount:request.refundAmount,status:'APPROVED'}));
  return {ID:request.ID,status:'RECEIVED',creditAmount:request.refundAmount,disposition:data.disposition};
 });
}
module.exports={authorizeReturn,receiveReturn};

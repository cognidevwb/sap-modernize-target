'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {cents}=require('../finance');
const {entity:E,owned,transition,command,positiveInteger,money}=require('./transaction');
async function createPurchaseOrder(tx,user,data) {
 return command(tx,user,'Buyer','PURCHASE_ORDER_CREATED',data,async()=>{
  const supplier=await tx.run(SELECT.one.from(E('Suppliers')).where({ID:data.supplierID}));
  if(!supplier||supplier.blocked)reject(422,'Supplier is unavailable');
  await owned(tx,'BusinessPartners',supplier.partner_ID,data.companyCode);
  if(!Array.isArray(data.items)||!data.items.length||data.items.length>100)reject(422,'Provide purchase order lines');
  if(!/^[A-Z]{3}$/.test(data.currency??''))reject(422,'Currency is required');
  const ID=cds.utils.uuid(),items=[];let total=0n;
  for(const item of data.items) {
   positiveInteger(item.quantity);const amount=cents(item.unitPrice);if(!amount)reject(422,'Unit price must be positive');
   if(!await tx.run(SELECT.one.from(E('Materials')).where({ID:item.materialID})))reject(422,'Unknown material');
   if(!await tx.run(SELECT.one.from(E('Plants')).where({code:item.plantCode,company_code:data.companyCode})))reject(422,'Unknown company plant');
   total+=amount*BigInt(item.quantity);items.push({ID:cds.utils.uuid(),order_ID:ID,material_ID:item.materialID,plant_code:item.plantCode,quantity:item.quantity,receivedQuantity:0,unitPrice:money(amount),dueDate:item.dueDate});
  }
  await tx.run(INSERT.into(E('PurchaseOrders')).entries({ID,supplier_ID:supplier.ID,companyCode:data.companyCode,currency:data.currency,total:money(total),status:'DRAFT',createdByActor:user.id}));
  await tx.run(INSERT.into(E('PurchaseOrderItems')).entries(items));return {ID,status:'DRAFT',total:money(total)};
 });
}
async function approvePurchaseOrder(tx,user,data) {
 return command(tx,user,'PurchasingManager','PURCHASE_ORDER_APPROVED',data,async()=>{
  const order=await owned(tx,'PurchaseOrders',data.purchaseOrderID,data.companyCode);
  if(order.createdByActor===user.id)reject(403,'Creator cannot approve own purchase order');
  await transition(tx,'PurchaseOrders',order,['DRAFT'],'APPROVED',{approvedByActor:user.id});return {ID:order.ID,status:'APPROVED'};
 });
}
async function receiveGoods(tx,user,data) {
 return command(tx,user,'Warehouse','GOODS_RECEIVED',data,async()=>{
  positiveInteger(data.quantity);if(!data.batch||data.batch.length>40)reject(422,'Batch is required');
  const order=await owned(tx,'PurchaseOrders',data.purchaseOrderID,data.companyCode);
  if(!['APPROVED','PARTIALLY_RECEIVED'].includes(order.status))reject(409,'Purchase order is not approved for receipt');
  const item=await tx.run(SELECT.one.from(E('PurchaseOrderItems')).where({ID:data.itemID,order_ID:order.ID}));
  if(!item)reject(404,'Purchase order line not found');
  const received=await tx.run(UPDATE(E('PurchaseOrderItems')).set({receivedQuantity:{'+=':data.quantity}}).where({ID:item.ID}).and('receivedQuantity +',data.quantity,'<= quantity'));
  if(received!==1)reject(409,'Receipt exceeds outstanding quantity');
  const lotID=cds.utils.uuid(),ID=cds.utils.uuid();
  await tx.run(INSERT.into(E('QualityLots')).entries({ID:lotID,companyCode:data.companyCode,plantCode:item.plant_code,material_ID:item.material_ID,batch:data.batch,quantity:data.quantity,status:'OPEN'}));
  await tx.run(INSERT.into(E('GoodsReceipts')).entries({ID,companyCode:data.companyCode,purchaseOrder_ID:order.ID,material_ID:item.material_ID,plantCode:item.plant_code,quantity:data.quantity,batch:data.batch,inspection_ID:lotID}));
  const outstanding=await tx.run(SELECT.from(E('PurchaseOrderItems')).where({order_ID:order.ID}));
  const status=outstanding.every(line=>line.receivedQuantity===line.quantity)?'RECEIVED':'PARTIALLY_RECEIVED';
  await tx.run(UPDATE(E('PurchaseOrders')).set({status}).where({ID:order.ID}));
  return {ID,status,inspectionID:lotID,quantity:data.quantity};
 });
}
module.exports={createPurchaseOrder,approvePurchaseOrder,receiveGoods};

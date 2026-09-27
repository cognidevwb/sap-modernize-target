'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {entity:E,owned,transition,command}=require('./transaction');
async function shipOrder(tx,user,data) {
 return command(tx,user,'Warehouse','ORDER_SHIPPED',data,async()=>{
  const order=await owned(tx,'SalesOrders',data.orderID,data.companyCode);
  if(!data.carrier||!data.trackingNumber)reject(422,'Carrier and tracking number are required');
  const reservations=await tx.run(SELECT.from(E('Reservations')).where({order_ID:order.ID,status:'RESERVED'}));
  const items=await tx.run(SELECT.from(E('SalesOrderItems')).where({order_ID:order.ID}));
  if(!items.length)reject(422,'Order has no items');
  const quantities=rows=>rows.reduce((map,r)=>{const key=r.material_ID+':'+r.plantCode;map[key]=(map[key]??0)+r.quantity;return map;},{});
  const expected=quantities(items),actual=quantities(reservations);
  if(Object.keys(expected).length!==Object.keys(actual).length||Object.entries(expected).some(([key,q])=>actual[key]!==q))reject(409,'Reservations do not match order items');
  const tasks=await tx.run(SELECT.from(E('WarehouseTasks')).where({reservation_ID:{in:reservations.map(r=>r.ID)}}));
  if(tasks.some(task=>task.status!=='CONFIRMED'))reject(409,'Assigned picking tasks must be confirmed before shipping');
  await transition(tx,'SalesOrders',order,['RELEASED'],'SHIPPED',{revision:order.revision+1});
  for(const reservation of reservations) {
   const count=await tx.run(UPDATE(E('Stock')).set({reserved:{'-=':reservation.quantity},revision:{'+=':1}}).where({material_ID:reservation.material_ID,plantCode:reservation.plantCode,companyCode:data.companyCode}).and('reserved >=',reservation.quantity));
   if(count!==1)reject(409,'Reserved stock is inconsistent');
   await tx.run(UPDATE(E('Reservations')).set({status:'SHIPPED'}).where({ID:reservation.ID,status:'RESERVED'}));
  }
  const ID=cds.utils.uuid();
  await tx.run(INSERT.into(E('Deliveries')).entries({ID,order_ID:order.ID,companyCode:data.companyCode,status:'SHIPPED',carrier:data.carrier,trackingNumber:data.trackingNumber,shippedAt:new Date().toISOString()}));
  await tx.run(INSERT.into(E('DeliveryItems')).entries(items.map(item=>({ID:cds.utils.uuid(),delivery_ID:ID,orderItem_ID:item.ID,quantity:item.quantity}))));
  return {ID,status:'SHIPPED',orderID:order.ID};
 });
}
module.exports={shipOrder};

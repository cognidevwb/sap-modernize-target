'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {cents}=require('../finance');
const {entity:E,owned,transition,command,positiveInteger,money}=require('./transaction');
async function createOrder(tx,user,data) {
 return command(tx,user,'Planner','ORDER_CREATED',data,async()=>{
  const customer=await owned(tx,'BusinessPartners',data.customerID,data.companyCode);
  if(customer.blocked)reject(422,'Customer is blocked');
  if(!Array.isArray(data.items)||!data.items.length||data.items.length>100)reject(422,'Provide 1 to 100 order lines');
  if(!/^[A-Z]{3}$/.test(data.currency??''))reject(422,'Currency is required');
  let total=0n;const ID=cds.utils.uuid(),items=[];
  for(const line of data.items) {
   positiveInteger(line.quantity);const price=cents(line.unitPrice);if(price===0n)reject(422,'Unit price must be positive');
   const material=await tx.run(SELECT.one.from(E('Materials')).where({ID:line.materialID}));
   const plant=await tx.run(SELECT.one.from(E('Plants')).where({code:line.plantCode,company_code:data.companyCode}));
   if(!material||!plant)reject(422,'Material or company plant is unknown');
   total+=price*BigInt(line.quantity);
   items.push({ID:cds.utils.uuid(),order_ID:ID,material_ID:line.materialID,plantCode:line.plantCode,quantity:line.quantity,unitPrice:money(price)});
  }
  await tx.run(INSERT.into(E('SalesOrders')).entries({ID,companyCode:data.companyCode,customer_ID:data.customerID,currency:data.currency,total:money(total),status:'DRAFT',revision:0,requestedDate:data.requestedDate}));
  await tx.run(INSERT.into(E('SalesOrderItems')).entries(items));
  return {ID,status:'DRAFT',total:money(total),revision:0};
 });
}
async function cancelOrder(tx,user,data) {
 return command(tx,user,'Planner','ORDER_CANCELLED',data,async()=>{
  const order=await owned(tx,'SalesOrders',data.orderID,data.companyCode);
  if(order.revision!==data.expectedRevision)reject(409,'Order revision changed');
  await transition(tx,'SalesOrders',order,['DRAFT','RELEASED'],'CANCELLED',{revision:order.revision+1});
  if(order.status==='RELEASED') {
   const reservations=await tx.run(SELECT.from(E('Reservations')).where({order_ID:order.ID,status:'RESERVED'}));
   for(const reservation of reservations) {
    const changed=await tx.run(UPDATE(E('Stock')).set({available:{'+=':reservation.quantity},reserved:{'-=':reservation.quantity},revision:{'+=':1}}).where({material_ID:reservation.material_ID,plantCode:reservation.plantCode,companyCode:data.companyCode}).and('reserved >=',reservation.quantity));
    if(changed!==1)reject(409,'Reservation and stock are inconsistent');
    await tx.run(UPDATE(E('Reservations')).set({status:'CANCELLED'}).where({ID:reservation.ID,status:'RESERVED'}));
   }
   const credit=await tx.run(UPDATE(E('BusinessPartners')).set({exposure:{'-=':order.total}}).where({ID:order.customer_ID,companyCode:data.companyCode}).and('exposure >=',order.total));
   if(credit!==1)reject(409,'Credit exposure is inconsistent');
  }
  return {ID:order.ID,status:'CANCELLED',revision:order.revision+1};
 });
}
module.exports={createOrder,cancelOrder};

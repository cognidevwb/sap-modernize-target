'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {entity:E,owned,transition,command}=require('./transaction');
async function assignPicking(tx,user,data) {
 return command(tx,user,'WarehouseSupervisor','PICKING_ASSIGNED',data,async()=>{
  const reservation=await tx.run(SELECT.one.from(E('Reservations')).where({ID:data.reservationID}));if(!reservation)reject(404,'Reservation not found');
  await owned(tx,'SalesOrders',reservation.order_ID,data.companyCode);
  if(reservation.status!=='RESERVED'||!data.sourceBin||!data.targetBin||!data.assignedTo)reject(422,'Active reservation, bins and assignee are required');
  if(await tx.run(SELECT.one.from(E('WarehouseTasks')).where({reservation_ID:reservation.ID})))reject(409,'Reservation already has a picking task');
  const ID=cds.utils.uuid();await tx.run(INSERT.into(E('WarehouseTasks')).entries({ID,companyCode:data.companyCode,reservation_ID:reservation.ID,sourceBin:data.sourceBin,targetBin:data.targetBin,assignedTo:data.assignedTo,status:'ASSIGNED'}));
  return {ID,status:'ASSIGNED'};
 });
}
async function confirmPicking(tx,user,data) {
 return command(tx,user,'Warehouse','PICKING_CONFIRMED',data,async()=>{
  const task=await owned(tx,'WarehouseTasks',data.taskID,data.companyCode);
  if(task.assignedTo!==user.id)reject(403,'Only the assigned picker may confirm');
  const reservation=await tx.run(SELECT.one.from(E('Reservations')).where({ID:task.reservation_ID}));
  if(!reservation||reservation.status!=='RESERVED'||data.quantity!==reservation.quantity)reject(422,'Pick must match the active reservation');
  await transition(tx,'WarehouseTasks',task,['ASSIGNED'],'CONFIRMED');
  await tx.run(UPDATE(E('WarehouseTasks')).set({confirmedAt:new Date().toISOString()}).where({ID:task.ID}));
  return {ID:task.ID,status:'CONFIRMED',quantity:data.quantity};
 });
}
module.exports={assignPicking,confirmPicking};

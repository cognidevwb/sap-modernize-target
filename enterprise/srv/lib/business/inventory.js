'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {entity:E,command,positiveInteger}=require('./transaction');
async function transferStock(tx,user,data) {
 return command(tx,user,'Warehouse','STOCK_TRANSFERRED',data,async()=>{
  positiveInteger(data.quantity);if(data.fromPlant===data.toPlant)reject(422,'Plants must differ');
  for(const code of [data.fromPlant,data.toPlant])if(!await tx.run(SELECT.one.from(E('Plants')).where({code,company_code:data.companyCode})))reject(403,'Plant is outside the company');
  const key={material_ID:data.materialID,companyCode:data.companyCode};
  const removed=await tx.run(UPDATE(E('Stock')).set({available:{'-=':data.quantity},revision:{'+=':1}}).where({...key,plantCode:data.fromPlant}).and('available >=',data.quantity));
  if(removed!==1)reject(409,'Insufficient stock to transfer');
  const added=await tx.run(UPDATE(E('Stock')).set({available:{'+=':data.quantity},revision:{'+=':1}}).where({...key,plantCode:data.toPlant}));
  if(!added)await tx.run(INSERT.into(E('Stock')).entries({...key,plantCode:data.toPlant,available:data.quantity,reserved:0,revision:0}));
  const ID=cds.utils.uuid();await tx.run(INSERT.into(E('StockMovements')).entries({ID,...key,fromPlant:data.fromPlant,toPlant:data.toPlant,quantity:data.quantity,reason:'TRANSFER'}));
  return {ID,status:'TRANSFERRED',quantity:data.quantity};
 });
}
async function countStock(tx,user,data) {
 return command(tx,user,'InventoryController','STOCK_COUNTED',data,async()=>{
  if(!Number.isSafeInteger(data.countedQuantity)||data.countedQuantity<0||!data.reason)reject(422,'Count and reason are required');
  const key={material_ID:data.materialID,plantCode:data.plantCode,companyCode:data.companyCode};
  const stock=await tx.run(SELECT.one.from(E('Stock')).where(key));if(!stock)reject(404,'Stock position not found');
  if(data.expectedRevision!==stock.revision)reject(409,'Stock changed during counting');
  if(data.countedQuantity<stock.reserved)reject(422,'Physical count cannot discard committed reservations');
  const available=data.countedQuantity-stock.reserved;
  const changed=await tx.run(UPDATE(E('Stock')).set({available,revision:stock.revision+1}).where({...key,revision:stock.revision}));if(changed!==1)reject(409,'Concurrent stock movement');
  const ID=cds.utils.uuid();await tx.run(INSERT.into(E('StockMovements')).entries({ID,...key,fromPlant:data.plantCode,toPlant:data.plantCode,quantity:available-stock.available,reason:data.reason}));
  return {ID,status:'COUNTED',available,reserved:stock.reserved,revision:stock.revision+1};
 });
}
module.exports={transferStock,countStock};

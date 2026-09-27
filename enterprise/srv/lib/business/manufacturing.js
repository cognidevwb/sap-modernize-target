'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {entity:E,owned,transition,command,positiveInteger}=require('./transaction');
async function scheduleProduction(tx,user,data) {
 return command(tx,user,'ProductionPlanner','PRODUCTION_SCHEDULED',data,async()=>{
  positiveInteger(data.quantity);
  const start=Date.parse(data.plannedStart),end=Date.parse(data.plannedEnd);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)reject(422,'Production dates must define a positive interval');
  if(!await tx.run(SELECT.one.from(E('Plants')).where({code:data.plantCode,company_code:data.companyCode})))reject(422,'Unknown company plant');
  if(!await tx.run(SELECT.one.from(E('Materials')).where({ID:data.materialID})))reject(422,'Unknown finished material');
  const day=new Date(start).toISOString().slice(0,10);
  const components=await tx.run(SELECT.from(E('BillsOfMaterial')).where({parent_ID:data.materialID}).and('validFrom <=',day).and('validTo >=',day));
  if(!components.length)reject(422,'No bill of material valid for the production date');
  const ID=cds.utils.uuid();
  await tx.run(INSERT.into(E('ProductionOrders')).entries({ID,companyCode:data.companyCode,material_ID:data.materialID,plant_code:data.plantCode,quantity:data.quantity,status:'SCHEDULED',plannedStart:new Date(start).toISOString(),plannedEnd:new Date(end).toISOString()}));
  // This EA-based demo requires integral component quantities; no implicit rounding of fractional BOMs.
  for(const component of components.sort((a,b)=>a.component_ID.localeCompare(b.component_ID))) {
   const needed=Number(component.quantity)*data.quantity;positiveInteger(needed,'BOM component quantity');
   const reserved=await tx.run(UPDATE(E('Stock')).set({available:{'-=':needed},reserved:{'+=':needed},revision:{'+=':1}}).where({material_ID:component.component_ID,plantCode:data.plantCode,companyCode:data.companyCode}).and('available >=',needed));
   if(reserved!==1)reject(409,'Insufficient production component stock');
   await tx.run(INSERT.into(E('ProductionComponents')).entries({ID:cds.utils.uuid(),production_ID:ID,material_ID:component.component_ID,quantity:needed,status:'RESERVED'}));
  }
  return {ID,status:'SCHEDULED',quantity:data.quantity};
 });
}
async function completeProduction(tx,user,data) {
 return command(tx,user,'ProductionPlanner','PRODUCTION_COMPLETED',data,async()=>{
  const order=await owned(tx,'ProductionOrders',data.productionID,data.companyCode);
  if(!Number.isInteger(data.goodQuantity)||!Number.isInteger(data.scrapQuantity)||data.goodQuantity<0||data.scrapQuantity<0||data.goodQuantity+data.scrapQuantity!==order.quantity)reject(422,'Good and scrap quantities must reconcile to production quantity');
  await transition(tx,'ProductionOrders',order,['SCHEDULED'],'COMPLETED',{goodQuantity:data.goodQuantity,scrapQuantity:data.scrapQuantity});
  const components=await tx.run(SELECT.from(E('ProductionComponents')).where({production_ID:order.ID,status:'RESERVED'}));
  if(!components.length)reject(409,'Production components are missing');
  for(const component of components) {
   const used=await tx.run(UPDATE(E('Stock')).set({reserved:{'-=':component.quantity},revision:{'+=':1}}).where({material_ID:component.material_ID,plantCode:order.plant_code,companyCode:data.companyCode}).and('reserved >=',component.quantity));
   if(used!==1)reject(409,'Production reservations are inconsistent');
   await tx.run(UPDATE(E('ProductionComponents')).set({status:'CONSUMED'}).where({ID:component.ID,status:'RESERVED'}));
  }
  if(data.goodQuantity>0) {
   const key={material_ID:order.material_ID,plantCode:order.plant_code,companyCode:data.companyCode};
   const changed=await tx.run(UPDATE(E('Stock')).set({available:{'+=':data.goodQuantity},revision:{'+=':1}}).where(key));
   if(!changed)await tx.run(INSERT.into(E('Stock')).entries({...key,available:data.goodQuantity,reserved:0,revision:0}));
  }
  return {ID:order.ID,status:'COMPLETED',goodQuantity:data.goodQuantity,scrapQuantity:data.scrapQuantity};
 });
}
module.exports={scheduleProduction,completeProduction};

'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {entity:E,owned,transition,command,positiveInteger}=require('./transaction');
async function inspectLot(tx,user,data) {
 return command(tx,user,'QualityInspector','QUALITY_LOT_INSPECTED',data,async()=>{
  const lot=await owned(tx,'QualityLots',data.lotID,data.companyCode);
  positiveInteger(data.sampled);
  if(data.sampled>lot.quantity||!Number.isInteger(data.defective)||data.defective<0||data.defective>data.sampled)reject(422,'Invalid inspection sample');
  const policy=await tx.run(SELECT.one.from(E('QualityPolicies')).where({material_ID:lot.material_ID,companyCode:data.companyCode}));
  if(!policy||!Number.isInteger(policy.maxDefectBasisPoints)||policy.maxDefectBasisPoints<0||policy.maxDefectBasisPoints>10000)reject(422,'Material quality policy is missing or invalid');
  if(!Array.isArray(data.findings)||!data.findings.length)reject(422,'Inspection characteristics are required');
  const findings=data.findings.map(item=>{
   if(!item.characteristic||![item.measured,item.lowerBound,item.upperBound].every(Number.isFinite)||item.lowerBound>item.upperBound)reject(422,'Invalid characteristic bounds');
   return {ID:cds.utils.uuid(),lot_ID:lot.ID,characteristic:item.characteristic,measured:item.measured,lowerBound:item.lowerBound,upperBound:item.upperBound,passed:item.measured>=item.lowerBound&&item.measured<=item.upperBound};
  });
  const accepted=findings.every(f=>f.passed)&&data.defective*10000<=data.sampled*policy.maxDefectBasisPoints;
  const status=accepted?'ACCEPTED':'REJECTED';
  await transition(tx,'QualityLots',lot,['OPEN'],status,{sampled:data.sampled,defective:data.defective,disposition:accepted?'UNRESTRICTED':'QUARANTINE'});
  await tx.run(INSERT.into(E('QualityFindings')).entries(findings));
  if(accepted) {
   const key={material_ID:lot.material_ID,plantCode:lot.plantCode,companyCode:lot.companyCode};
   const count=await tx.run(UPDATE(E('Stock')).set({available:{'+=':lot.quantity},revision:{'+=':1}}).where(key));
   if(!count)await tx.run(INSERT.into(E('Stock')).entries({...key,available:lot.quantity,reserved:0,revision:0}));
  }
  return {ID:lot.ID,status,quantity:lot.quantity};
 });
}
module.exports={inspectLot};

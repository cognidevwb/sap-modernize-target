'use strict';
const cds=require('@sap/cds');
const {SELECT,INSERT}=cds.ql;
const {reject,requireRole,requireCompany}=require('../errors');
const {cents}=require('../finance');
const {isoDate}=require('./validation');
const {entity:E,owned,command,positiveInteger,money}=require('./transaction');
async function maintainPrice(tx,user,data) {
 return command(tx,user,'PricingManager','PRICE_MAINTAINED',data,async()=>{
  await owned(tx,'BusinessPartners',data.customerID,data.companyCode);
  if(!await tx.run(SELECT.one.from(E('Materials')).where({ID:data.materialID})))reject(422,'Material not found');
  isoDate(data.validFrom,'Price start');isoDate(data.validTo,'Price end');
  if(data.validFrom>data.validTo)reject(422,'Valid pricing interval is required');
  await tx.run(SELECT.one.from(E('BusinessPartners')).where({ID:data.customerID,companyCode:data.companyCode}).forUpdate());
  if(!/^[A-Z]{3}$/.test(data.currency??''))reject(422,'Currency is required');
  const existing=await tx.run(SELECT.from(E('PricingConditions')).where({customer_ID:data.customerID,material_ID:data.materialID,currency:data.currency}).and('validFrom <=',data.validTo).and('validTo >=',data.validFrom));
  if(existing.length)reject(409,'Price validity intervals overlap');
  const ID=cds.utils.uuid(),amount=cents(data.amount);if(!amount)reject(422,'Price must be positive');
  await tx.run(INSERT.into(E('PricingConditions')).entries({ID,companyCode:data.companyCode,customer_ID:data.customerID,material_ID:data.materialID,amount:money(amount),currency:data.currency,validFrom:data.validFrom,validTo:data.validTo}));
  return {ID,status:'ACTIVE',amount:money(amount)};
 });
}
async function quotePrice(tx,user,data) {
 requireRole(user,'Planner');requireCompany(user,data.companyCode);isoDate(data.onDate,'Price date');positiveInteger(data.quantity);
 await owned(tx,'BusinessPartners',data.customerID,data.companyCode);
 const rows=await tx.run(SELECT.from(E('PricingConditions')).where({companyCode:data.companyCode,customer_ID:data.customerID,material_ID:data.materialID,currency:data.currency}).and('validFrom <=',data.onDate).and('validTo >=',data.onDate));
 if(rows.length!==1)reject(422,'Exactly one effective price is required');
 return {ID:rows[0].ID,unitPrice:money(cents(rows[0].amount)),total:money(cents(rows[0].amount)*BigInt(data.quantity)),currency:data.currency};
}
module.exports={maintainPrice,quotePrice};

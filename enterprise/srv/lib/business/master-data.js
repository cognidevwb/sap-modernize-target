'use strict';
const cds=require('@sap/cds');
const {INSERT,UPDATE}=cds.ql;
const {reject}=require('../errors');
const {cents}=require('../finance');
const {entity:E,owned,command,money}=require('./transaction');
async function registerPartner(tx,user,data) {
 return command(tx,user,'MasterDataAdmin','PARTNER_REGISTERED',data,async()=>{
  if(!data.name||data.name.length>120||!/^[A-Z]{2}$/.test(data.country??''))reject(422,'Partner name and ISO country are required');
  const ID=cds.utils.uuid(),limit=cents(data.creditLimit);
  await tx.run(INSERT.into(E('BusinessPartners')).entries({ID,companyCode:data.companyCode,name:data.name,country:data.country,creditLimit:money(limit),exposure:'0.00',blocked:false}));
  return {ID,status:'ACTIVE',creditLimit:money(limit)};
 });
}
async function reviseCreditLimit(tx,user,data) {
 return command(tx,user,'CreditManager','CREDIT_LIMIT_CHANGED',data,async()=>{
  const partner=await owned(tx,'BusinessPartners',data.partnerID,data.companyCode),limit=cents(data.creditLimit);
  if(limit<cents(partner.exposure))reject(409,'Credit limit cannot fall below current exposure');
  const changed=await tx.run(UPDATE(E('BusinessPartners')).set({creditLimit:money(limit)}).where({ID:partner.ID,creditLimit:partner.creditLimit,exposure:partner.exposure}));
  if(changed!==1)reject(409,'Partner exposure changed concurrently');
  return {ID:partner.ID,status:'UPDATED',creditLimit:money(limit)};
 });
}
async function blockPartner(tx,user,data) {
 return command(tx,user,'MasterDataAdmin','PARTNER_BLOCK_CHANGED',data,async()=>{
  const partner=await owned(tx,'BusinessPartners',data.partnerID,data.companyCode);
  if(typeof data.blocked!=='boolean'||!data.reason)reject(422,'Block decision and reason are required');
  await tx.run(UPDATE(E('BusinessPartners')).set({blocked:data.blocked}).where({ID:partner.ID}));
  return {ID:partner.ID,status:data.blocked?'BLOCKED':'ACTIVE',detail:data.reason};
 });
}
module.exports={registerPartner,reviseCreditLimit,blockPartner};

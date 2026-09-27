'use strict';
const cds = require('@sap/cds');
const {createHash} = require('node:crypto');
const {reject, requireRole, requireCompany} = require('../errors');
const {SELECT, INSERT, UPDATE} = cds.ql;
const entity = name => `enterprise.${name}`;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
async function owned(tx,name,ID,companyCode) {
 const row=await tx.run(SELECT.one.from(entity(name)).where({ID}));
 if(!row) reject(404,`${name} record not found`);
 if(row.companyCode!==companyCode) reject(403,'Company access denied');
 return row;
}
async function transition(tx,name,row,from,to,extra={}) {
 if(!from.includes(row.status)) reject(409,`${name} cannot move from ${row.status} to ${to}`);
 const count=await tx.run(UPDATE(entity(name)).set({...extra,status:to}).where({ID:row.ID,status:row.status}));
 if(count!==1) reject(409,`${name} changed concurrently`);
}
async function audit(tx,user,action,ID,companyCode,requestID,detail) {
 await tx.run(INSERT.into(entity('AuditEvents')).entries({ID:cds.utils.uuid(),actor:user.id,action,aggregateID:ID,companyCode,correlationID:requestID,detail}));
 await tx.run(INSERT.into(entity('IntegrationEvents')).entries({ID:cds.utils.uuid(),companyCode,topic:`enterprise.${action.toLowerCase().replaceAll('_','.')}.v1`,aggregateID:ID,payload:JSON.stringify({ID,companyCode,requestID}),status:'PENDING',attempts:0}));
}
/** Must be called within the caller's transaction, including request reservation and audit/outbox writes. */
async function command(tx,user,role,action,data,work) {
 requireRole(user,role);requireCompany(user,data.companyCode);
 if(!/^[A-Za-z0-9_-]{8,80}$/.test(data.requestID??'')) reject(400,'A stable request ID is required');
 const fingerprint=digest({...data,action});
 const previous=await tx.run(SELECT.one.from(entity('BusinessCommands')).where({requestID:data.requestID}));
 if(previous) {
  if(previous.actor!==user.id || previous.companyCode!==data.companyCode || previous.fingerprint!==fingerprint) reject(409,'Request ID was used for a different command');
  if(!previous.response) reject(409,'Request is in progress');
  return JSON.parse(previous.response);
 }
 await tx.run(INSERT.into(entity('BusinessCommands')).entries({requestID:data.requestID,actor:user.id,companyCode:data.companyCode,fingerprint,action}));
 const result=await work();
 await audit(tx,user,action,result.ID,data.companyCode,data.requestID,result.detail??action);
 await tx.run(UPDATE(entity('BusinessCommands')).set({response:JSON.stringify(result)}).where({requestID:data.requestID}));
 return result;
}
function positiveInteger(value,label='Quantity') { if(!Number.isSafeInteger(value)||value<=0)reject(422,`${label} must be a positive integer`);return value; }
function money(minor) { if(minor<0n || minor>999999999999999n) reject(422,'Amount is out of range');return `${minor/100n}.${String(minor%100n).padStart(2,'0')}`; }
module.exports={entity,owned,transition,command,audit,positiveInteger,money};

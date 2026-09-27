'use strict';
const cds=require('@sap/cds');
const {reject}=require('../../srv/lib/errors');
async function resolve(tx,companyCode,sourceSystem,objectType,externalID) {
 const item=await tx.run(cds.ql.SELECT.one.from('enterprise.ExternalIdentifiers').where({companyCode,sourceSystem,objectType,externalID}));
 if(!item)reject(422,`No ${objectType} mapping for the external identifier`);
 return item.internalID;
}
async function register(tx,companyCode,sourceSystem,objectType,externalID,internalID) {
 const key={companyCode,sourceSystem,objectType,externalID};
 const previous=await tx.run(cds.ql.SELECT.one.from('enterprise.ExternalIdentifiers').where(key));
 if(previous){if(previous.internalID!==internalID)reject(409,'External identifier points at another object');return;}
 await tx.run(cds.ql.INSERT.into('enterprise.ExternalIdentifiers').entries({...key,internalID}));
}
module.exports={resolve,register};

'use strict';
const {createHash}=require('node:crypto');
const {parseXml,scalar}=require('./xml');
const {resolve}=require('./identifiers');
const {reject}=require('../../srv/lib/errors');
const {shipOrder}=require('../../srv/lib/business/logistics');
async function confirmDelivery(tx,user,envelope) {
 const body=parseXml(envelope.payload)?.Envelope?.Body?.ConfirmDelivery;
 if(!body||Array.isArray(body))reject(422,'One ConfirmDelivery SOAP operation is required');
 if(body.CompanyCode!==envelope.companyCode)reject(403,'SOAP company does not match authenticated scope');
 const message=scalar(body.MessageID,'SOAP message ID',80),externalID=scalar(body.OrderNumber,'External order',40);
 const orderID=await resolve(tx,envelope.companyCode,envelope.sourceSystem,'order',externalID);
 const requestID='soap_'+createHash('sha256').update(`${envelope.sourceSystem}:${envelope.companyCode}:${message}`).digest('hex');
 return shipOrder(tx,user,{companyCode:envelope.companyCode,requestID,orderID,carrier:scalar(body.Carrier,'Carrier',80),trackingNumber:scalar(body.TrackingNumber,'Tracking number',80),sourcePayloadSha256:createHash('sha256').update(envelope.payload).digest('hex')});
}
module.exports={confirmDelivery};

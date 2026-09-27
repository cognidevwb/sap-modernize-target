'use strict';
const {createHash}=require('node:crypto');
const {resolve}=require('./identifiers');
const {reject}=require('../../srv/lib/errors');
const {settlePayment}=require('../../srv/lib/business/billing');
async function receivePayment(tx,user,envelope) {
 let event;try {event=JSON.parse(envelope.payload);}catch {reject(422,'Malformed CloudEvent JSON');}
 if(event.specversion!=='1.0'||event.type!=='enterprise.payment.received.v1'||event.datacontenttype!=='application/json'||typeof event.id!=='string'||!event.id||event.id.length>100||event.source!==envelope.sourceSystem)reject(422,'Unsupported CloudEvent contract');
 const data=event.data;
 if(!data||data.companyCode!==envelope.companyCode)reject(403,'Event company does not match authenticated scope');
 if(typeof data.invoiceNumber!=='string'||!data.invoiceNumber)reject(422,'Invoice reference is required');
 const invoiceID=await resolve(tx,envelope.companyCode,envelope.sourceSystem,'invoice',data.invoiceNumber);
 return settlePayment(tx,user,{companyCode:envelope.companyCode,requestID:'event_'+createHash('sha256').update(`${event.source}:${envelope.companyCode}:${event.id}`).digest('hex'),invoiceID,amount:data.amount,currency:data.currency,bankReference:data.bankReference,sourcePayloadSha256:createHash('sha256').update(envelope.payload).digest('hex')});
}
module.exports={receivePayment};

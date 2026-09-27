'use strict';
const {verifyEnvelope}=require('./security');
const {receiveOrder}=require('./orders05');
const {confirmDelivery}=require('./delivery-soap');
const {receivePayment}=require('./payment-event');
const {reject}=require('../../srv/lib/errors');
const handlers={idoc:receiveOrder,soap:confirmDelivery,eventmesh:receivePayment};
async function receive(tx,user,envelope,{secret,now=Date.now()}={}) {
 verifyEnvelope(user,envelope,secret,now);
 if(!/^[A-Za-z0-9_-]{1,40}$/.test(envelope.sourceSystem??''))reject(422,'Source system is required');
 const handler=handlers[envelope.channel];if(!handler)reject(422,'Unsupported integration channel');
 return handler(tx,user,envelope);
}
module.exports={receive};

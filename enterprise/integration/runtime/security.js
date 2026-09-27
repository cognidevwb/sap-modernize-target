'use strict';
const {createHmac,timingSafeEqual}=require('node:crypto');
const {reject,requireRole,requireCompany}=require('../../srv/lib/errors');
function verifyEnvelope(user,{payload,signature,timestamp,companyCode,channel,sourceSystem},secret,now=Date.now()) {
 requireRole(user,'IntegrationOperator');requireCompany(user,companyCode);
 if(typeof secret!=='string'||Buffer.byteLength(secret)<32)reject(503,'Integration signing key is not configured');
 if(typeof payload!=='string'||Buffer.byteLength(payload)>1048576)reject(413,'Integration message exceeds the supported size');
 if(!/^\d{10}$/.test(String(timestamp))||Math.abs(now/1000-Number(timestamp))>300)reject(401,'Integration signature timestamp is outside the acceptance window');
 if(!/^[a-f0-9]{64}$/.test(signature??''))reject(401,'Invalid integration signature');
 const expected=createHmac('sha256',secret).update(`${timestamp}\n${companyCode}\n${channel}\n${sourceSystem}\n${payload}`).digest();
 if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))reject(401,'Invalid integration signature');
}
module.exports={verifyEnvelope};

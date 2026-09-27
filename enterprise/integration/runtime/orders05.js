'use strict';
const {createHash}=require('node:crypto');
const {parseXml,list,scalar}=require('./xml');
const identifiers=require('./identifiers');
const {reject}=require('../../srv/lib/errors');
const {isoDate}=require('../../srv/lib/business/validation');
const {createOrder}=require('../../srv/lib/business/sales');
async function receiveOrder(tx,user,envelope) {
 const doc=parseXml(envelope.payload)?.ORDERS05?.IDOC;
 if(!doc||Array.isArray(doc))reject(422,'Exactly one ORDERS05 IDoc is required');
 const control=doc.EDI_DC40;
 if(control?.MESTYP!=='ORDERS'||control.IDOCTYP!=='ORDERS05'||control.CIMTYP!=='ZENT_ORDERS05')reject(422,'Unsupported IDoc type or extension');
 const sender=scalar(control.SNDPRN,'IDoc sender',40),number=scalar(control.DOCNUM,'IDoc number',16);
 if(sender!==envelope.sourceSystem||!/^\d{1,16}$/.test(number))reject(422,'IDoc sender or number is invalid');
 if(doc.Z1ENT_SCOPE?.BUKRS!==envelope.companyCode)reject(403,'IDoc company does not match the authenticated scope');
 const partners=list(doc.E1EDKA1).filter(x=>x.PARVW==='AG');
 if(partners.length!==1)reject(422,'Exactly one sold-to partner is required');
 const customerID=await identifiers.resolve(tx,envelope.companyCode,sender,'customer',scalar(partners[0].PARTN,'Sold-to partner',40));
 const currency=scalar(doc.E1EDK01?.CURCY,'Currency',3),plantCode=scalar(doc.Z1ENT_SCOPE.WERKS,'Plant',4);
 const requested=scalar(doc.Z1ENT_SCOPE.REQUESTED_DATE,'Requested date',10);isoDate(requested);
 const input=list(doc.E1EDP01);if(input.length<1||input.length>100)reject(422,'IDoc must contain 1 to 100 order lines');
 const items=[];const positions=new Set();
 for(const item of input) {
  const position=scalar(item.POSEX,'Item position',6);if(positions.has(position))reject(422,'Duplicate IDoc position');positions.add(position);
  if(item.MENEE!=='EA'||!/^\d{1,9}$/.test(item.MENGE??'')||Number(item.MENGE)<=0)reject(422,'Only positive integral EA quantities are supported');
  const material=list(item.E1EDP19).filter(x=>x.QUALF==='002');if(material.length!==1)reject(422,'Exactly one material identifier is required');
  const materialID=await identifiers.resolve(tx,envelope.companyCode,sender,'material',scalar(material[0].IDTNR,'Material',40));
  items.push({materialID,plantCode,quantity:Number(item.MENGE),unitPrice:scalar(item.VPREI,'Unit price',16)});
 }
 const payloadDigest=createHash('sha256').update(envelope.payload).digest('hex');
 const requestID='idoc_'+createHash('sha256').update(`${sender}:${envelope.companyCode}:${number}`).digest('hex');
 const result=await createOrder(tx,user,{companyCode:envelope.companyCode,requestID,customerID,currency,requestedDate:requested,items,sourcePayloadSha256:payloadDigest});
 await identifiers.register(tx,envelope.companyCode,sender,'order',number,result.ID);
 return {...result,externalID:number};
}
module.exports={receiveOrder};

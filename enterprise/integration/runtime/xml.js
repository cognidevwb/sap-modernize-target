'use strict';
const {XMLParser,XMLValidator}=require('fast-xml-parser');
const {reject}=require('../../srv/lib/errors');
const parser=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,trimValues:true,processEntities:false});
function parseXml(payload) {
 if(/<!DOCTYPE|<!ENTITY/i.test(payload))reject(422,'DTD and entity declarations are not accepted');
 if(XMLValidator.validate(payload)!==true)reject(422,'Malformed XML message');
 return parser.parse(payload);
}
const list=value=>value==null?[]:Array.isArray(value)?value:[value];
function scalar(value,name,max=100) {
 if(typeof value!=='string'||!value.trim()||value.length>max)reject(422,`${name} is missing or invalid`);
 return value.trim();
}
module.exports={parseXml,list,scalar};

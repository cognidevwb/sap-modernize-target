'use strict';
const {reject}=require('../errors');
function isoDate(value,label='Date') {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))reject(422,`${label} must be an ISO date`);
 const date=new Date(value+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)reject(422,`${label} is not a calendar date`);
 return value;
}
module.exports={isoDate};

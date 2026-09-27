'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/manufacturing');
module.exports=class Manufacturing extends cds.ApplicationService {
 async init(){
  this.on('scheduleProduction',req=>operations.scheduleProduction(cds.tx(req),req.user,req.data));
  this.on('completeProduction',req=>operations.completeProduction(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/logistics');
module.exports=class Logistics extends cds.ApplicationService {
 async init(){
  this.on('shipOrder',req=>operations.shipOrder(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

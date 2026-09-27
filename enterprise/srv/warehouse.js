'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/warehouse');
module.exports=class Warehouse extends cds.ApplicationService {
 async init(){
  this.on('assignPicking',req=>operations.assignPicking(cds.tx(req),req.user,req.data));
  this.on('confirmPicking',req=>operations.confirmPicking(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

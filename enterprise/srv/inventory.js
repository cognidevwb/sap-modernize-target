'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/inventory');
module.exports=class Inventory extends cds.ApplicationService {
 async init(){
  this.on('transferStock',req=>operations.transferStock(cds.tx(req),req.user,req.data));
  this.on('countStock',req=>operations.countStock(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

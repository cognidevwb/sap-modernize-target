'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/pricing');
module.exports=class Pricing extends cds.ApplicationService {
 async init(){
  this.on('maintainPrice',req=>operations.maintainPrice(cds.tx(req),req.user,req.data));
  this.on('quotePrice',req=>operations.quotePrice(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/master-data');
module.exports=class MasterData extends cds.ApplicationService {
 async init(){
  this.on('registerPartner',req=>operations.registerPartner(cds.tx(req),req.user,req.data));
  this.on('reviseCreditLimit',req=>operations.reviseCreditLimit(cds.tx(req),req.user,req.data));
  this.on('blockPartner',req=>operations.blockPartner(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

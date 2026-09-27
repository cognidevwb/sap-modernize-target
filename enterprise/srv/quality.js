'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/quality');
module.exports=class Quality extends cds.ApplicationService {
 async init(){
  this.on('inspectLot',req=>operations.inspectLot(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

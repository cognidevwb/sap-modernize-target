'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/returns');
module.exports=class ReturnsService extends cds.ApplicationService {
 async init(){
  this.on('authorizeReturn',req=>operations.authorizeReturn(cds.tx(req),req.user,req.data));
  this.on('receiveReturn',req=>operations.receiveReturn(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

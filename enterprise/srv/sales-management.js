'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/sales');
module.exports=class SalesManagement extends cds.ApplicationService {
 async init(){
  this.on('createOrder',req=>operations.createOrder(cds.tx(req),req.user,req.data));
  this.on('cancelOrder',req=>operations.cancelOrder(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

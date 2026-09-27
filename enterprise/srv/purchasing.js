'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/procurement');
module.exports=class Purchasing extends cds.ApplicationService {
 async init(){
  this.on('createPurchaseOrder',req=>operations.createPurchaseOrder(cds.tx(req),req.user,req.data));
  this.on('approvePurchaseOrder',req=>operations.approvePurchaseOrder(cds.tx(req),req.user,req.data));
  this.on('receiveGoods',req=>operations.receiveGoods(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

'use strict';
const cds=require('@sap/cds');
const operations=require('./lib/business/billing');
module.exports=class Billing extends cds.ApplicationService {
 async init(){
  this.on('invoiceOrder',req=>operations.invoiceOrder(cds.tx(req),req.user,req.data));
  this.on('settlePayment',req=>operations.settlePayment(cds.tx(req),req.user,req.data));
  return super.init();
 }
};

using { contracts } from './business-types';
@path:'/purchasing' @requires:'authenticated-user'
service Purchasing {
 @requires:'Buyer' action createPurchaseOrder(companyCode:String(4),requestID:String(80),supplierID:UUID,currency:String(3),items:many contracts.OrderLine) returns contracts.CommandResult;
 @requires:'PurchasingManager' action approvePurchaseOrder(companyCode:String(4),requestID:String(80),purchaseOrderID:UUID) returns contracts.CommandResult;
 @requires:'Warehouse' action receiveGoods(companyCode:String(4),requestID:String(80),purchaseOrderID:UUID,itemID:UUID,quantity:Integer,batch:String(40)) returns contracts.CommandResult;
}

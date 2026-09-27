using { contracts } from './business-types';
@path:'/billing' @requires:'authenticated-user'
service Billing {
 @requires:'Accountant' action invoiceOrder(companyCode:String(4),requestID:String(80),orderID:UUID,dueDate:Date) returns contracts.CommandResult;
 @requires:'Accountant' action settlePayment(companyCode:String(4),requestID:String(80),invoiceID:UUID,amount:Decimal(15,2),currency:String(3),bankReference:String(80)) returns contracts.CommandResult;
}

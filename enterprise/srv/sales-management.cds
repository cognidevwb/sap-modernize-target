using { contracts } from './business-types';
@path:'/sales-management' @requires:'authenticated-user'
service SalesManagement {
 @requires:'Planner' action createOrder(companyCode:String(4),requestID:String(80),customerID:UUID,currency:String(3),requestedDate:Date,items:many contracts.OrderLine) returns contracts.CommandResult;
 @requires:'Planner' action cancelOrder(companyCode:String(4),requestID:String(80),orderID:UUID,expectedRevision:Integer) returns contracts.CommandResult;
}

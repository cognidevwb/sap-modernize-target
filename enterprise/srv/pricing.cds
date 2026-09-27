using { contracts } from './business-types';
@path:'/pricing' @requires:'authenticated-user'
service Pricing {
 @requires:'PricingManager' action maintainPrice(companyCode:String(4),requestID:String(80),customerID:UUID,materialID:UUID,currency:String(3),amount:Decimal(15,2),validFrom:Date,validTo:Date) returns contracts.CommandResult;
 @requires:'Planner' action quotePrice(companyCode:String(4),requestID:String(80),customerID:UUID,materialID:UUID,currency:String(3),quantity:Integer,onDate:Date) returns contracts.CommandResult;
}

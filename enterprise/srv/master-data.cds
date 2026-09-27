using { contracts } from './business-types';
@path:'/master-data' @requires:'authenticated-user'
service MasterData {
 @requires:'MasterDataAdmin' action registerPartner(companyCode:String(4),requestID:String(80),name:String(120),country:String(2),creditLimit:Decimal(15,2)) returns contracts.CommandResult;
 @requires:'CreditManager' action reviseCreditLimit(companyCode:String(4),requestID:String(80),partnerID:UUID,creditLimit:Decimal(15,2)) returns contracts.CommandResult;
 @requires:'MasterDataAdmin' action blockPartner(companyCode:String(4),requestID:String(80),partnerID:UUID,blocked:Boolean,reason:String(200)) returns contracts.CommandResult;
}

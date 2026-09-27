using { contracts } from './business-types';
@path:'/returns' @requires:'authenticated-user'
service ReturnsService {
 @requires:'CustomerService' action authorizeReturn(companyCode:String(4),requestID:String(80),orderID:UUID,reason:String(200),items:many contracts.ReturnLine) returns contracts.CommandResult;
 @requires:'QualityInspector' action receiveReturn(companyCode:String(4),requestID:String(80),returnID:UUID,disposition:String(20)) returns contracts.CommandResult;
}

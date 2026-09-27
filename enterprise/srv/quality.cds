using { contracts } from './business-types';
@path:'/quality' @requires:'authenticated-user'
service Quality {
 @requires:'QualityInspector' action inspectLot(companyCode:String(4),requestID:String(80),lotID:UUID,sampled:Integer,defective:Integer,findings:many contracts.Inspection) returns contracts.CommandResult;
}

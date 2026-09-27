using { contracts } from './business-types';
@path:'/manufacturing' @requires:'authenticated-user'
service Manufacturing {
 @requires:'ProductionPlanner' action scheduleProduction(companyCode:String(4),requestID:String(80),materialID:UUID,plantCode:String(4),quantity:Integer,plannedStart:Timestamp,plannedEnd:Timestamp) returns contracts.CommandResult;
 @requires:'ProductionPlanner' action completeProduction(companyCode:String(4),requestID:String(80),productionID:UUID,goodQuantity:Integer,scrapQuantity:Integer) returns contracts.CommandResult;
}

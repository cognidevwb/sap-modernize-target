using { contracts } from './business-types';
@path:'/warehouse' @requires:'authenticated-user'
service Warehouse {
 @requires:'WarehouseSupervisor' action assignPicking(companyCode:String(4),requestID:String(80),reservationID:UUID,sourceBin:String(30),targetBin:String(30),assignedTo:String(80)) returns contracts.CommandResult;
 @requires:'Warehouse' action confirmPicking(companyCode:String(4),requestID:String(80),taskID:UUID,quantity:Integer) returns contracts.CommandResult;
}

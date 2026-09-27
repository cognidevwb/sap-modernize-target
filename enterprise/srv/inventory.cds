using { contracts } from './business-types';
@path:'/inventory' @requires:'authenticated-user'
service Inventory {
 @requires:'Warehouse' action transferStock(companyCode:String(4),requestID:String(80),materialID:UUID,fromPlant:String(4),toPlant:String(4),quantity:Integer) returns contracts.CommandResult;
 @requires:'InventoryController' action countStock(companyCode:String(4),requestID:String(80),materialID:UUID,plantCode:String(4),countedQuantity:Integer,expectedRevision:Integer,reason:String(200)) returns contracts.CommandResult;
}

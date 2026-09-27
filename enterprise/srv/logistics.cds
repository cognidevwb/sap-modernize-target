using { contracts } from './business-types';
@path:'/logistics' @requires:'authenticated-user'
service Logistics {
 @requires:'Warehouse' action shipOrder(companyCode:String(4),requestID:String(80),orderID:UUID,carrier:String(80),trackingNumber:String(80)) returns contracts.CommandResult;
}

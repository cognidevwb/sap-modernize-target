using { enterprise as db } from '../db/schema';
@path:'/supply' @requires:'Planner'
service Supply {
 @readonly @restrict:[{grant:'READ',to:'Planner',where:'companyCode = $user.companyCode'}]
 entity PurchaseOrders as projection on db.PurchaseOrders;
 @readonly entity Suppliers as projection on db.Suppliers { ID, purchasingOrg, rating, blocked };
 @readonly entity Materials as projection on db.Materials;
}

using { enterprise as db } from '../db/schema';
@path: '/control-tower'
@requires: 'authenticated-user'
service ControlTower {
 @readonly @restrict: [{ grant:'READ', to:'Viewer', where:'companyCode = $user.companyCode' }]
 entity Orders as projection on db.SalesOrders;
 @readonly @requires:'Viewer' entity Materials as projection on db.Materials;
 @readonly @restrict: [{ grant:'READ', to:'Viewer', where:'companyCode = $user.companyCode' }] entity Stock as projection on db.Stock;
 @readonly @restrict: [{ grant:'READ', to:'Operator', where:'companyCode = $user.companyCode' }]
 entity Incidents as projection on db.Incidents;
 @readonly @requires:'Operator' entity Objectives as projection on db.ServiceObjectives;
 @requires:'Planner' action releaseOrder(orderID: UUID, requestID: String(80), expectedRevision: Integer) returns { ID: UUID; status: String(20); revision: Integer; };
 @requires:'Operator' action ingestMonitoringEvent(eventID: String(100), companyCode: String(4), service: String(100), severity: String(12), summary: String(300), correlationID: String(100)) returns UUID;
 @requires:'Operator' action acknowledgeIncident(incidentID: UUID) returns Boolean;
}

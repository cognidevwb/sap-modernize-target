'use strict';
const cds = require('@sap/cds');
const { SELECT, INSERT, UPDATE } = cds.ql;
const { reject, requireRole, requireCompany } = require('./errors');
/** Receives our normalized Integration Suite contract, not an invented SAP Cloud ALM API. */
async function ingestMonitoringEvent(tx, user, event) {
 requireRole(user,'Operator'); requireCompany(user,event.companyCode);
 if (!/^[A-Za-z0-9_.:-]{1,100}$/.test(event.eventID ?? '') || !['INFO','WARNING','CRITICAL'].includes(event.severity) || !event.service || !event.summary) reject(400,'Invalid normalized monitoring event');
 if (event.service.length > 100 || event.summary.length > 300 || (event.correlationID?.length ?? 0) > 100) reject(400,'Monitoring event exceeds field limits');
 const seen = await tx.run(SELECT.one.from('enterprise.MonitoringEvents').where({ externalEventID:event.eventID }));
 if (seen) {
  const incident = await tx.run(SELECT.one.from('enterprise.Incidents').where({ ID:seen.incident_ID }));
  requireCompany(user,incident?.companyCode);
  return incident.ID;
 }
 const ID = cds.utils.uuid();
 await tx.run(INSERT.into('enterprise.MonitoringEvents').entries({ externalEventID:event.eventID, incident_ID:ID, receivedAt:new Date().toISOString() }));
 await tx.run(INSERT.into('enterprise.Incidents').entries({ ID, externalEventID:event.eventID, source:'CLOUD_ALM_NORMALIZED', companyCode:event.companyCode, service:event.service, severity:event.severity, summary:event.summary, correlationID:event.correlationID, status:'OPEN' }));
 return ID;
}
async function acknowledgeIncident(tx,user,incidentID) {
 requireRole(user,'Operator');
 const incident = await tx.run(SELECT.one.from('enterprise.Incidents').where({ ID:incidentID }));
 if (!incident) reject(404,'Incident not found');
 requireCompany(user,incident.companyCode);
 if (incident.status === 'ACKNOWLEDGED') return true;
 const updated = await tx.run(UPDATE('enterprise.Incidents').set({ status:'ACKNOWLEDGED', acknowledgedBy:user.id }).where({ ID:incidentID, status:'OPEN' }));
 if (updated !== 1) reject(409,'Incident is not open');
 await tx.run(INSERT.into('enterprise.AuditEvents').entries({ ID:cds.utils.uuid(), actor:user.id, action:'INCIDENT_ACKNOWLEDGED', aggregateID:incidentID, companyCode:incident.companyCode, correlationID:incident.correlationID, detail:'Operator acknowledged monitoring incident' }));
 return true;
}
module.exports = { ingestMonitoringEvent, acknowledgeIncident };

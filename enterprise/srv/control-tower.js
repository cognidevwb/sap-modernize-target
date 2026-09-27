'use strict';
const cds = require('@sap/cds');
const { releaseOrder } = require('./lib/order-workflow');
const { ingestMonitoringEvent, acknowledgeIncident } = require('./lib/monitoring');
module.exports = class ControlTower extends cds.ApplicationService {
 async init() {
  this.on('releaseOrder', req => releaseOrder(cds.tx(req), req.user, req.data));
  this.on('ingestMonitoringEvent', req => ingestMonitoringEvent(cds.tx(req), req.user, req.data));
  this.on('acknowledgeIncident', req => acknowledgeIncident(cds.tx(req), req.user, req.data.incidentID));
  return super.init();
 }
};

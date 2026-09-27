'use strict';
const cds = require('@sap/cds');
const { SELECT, INSERT, UPDATE } = cds.ql;
const { reject, requireRole, requireCompany } = require('./errors');
const E = name => `enterprise.${name}`;
/** Caller owns the transaction: orders, credit, stock, audit and outbox commit together. */
async function releaseOrder(tx, user, command) {
 requireRole(user, 'Planner');
 const { orderID, requestID, expectedRevision } = command;
 if (!orderID || !/^[A-Za-z0-9_-]{8,80}$/.test(requestID ?? '') || !Number.isInteger(expectedRevision)) reject(400, 'Invalid release command');
 const order = await tx.run(SELECT.one.from(E('SalesOrders')).where({ ID: orderID }));
 if (!order) reject(404, 'Order not found');
 requireCompany(user, order.companyCode);
 const previous = await tx.run(SELECT.one.from(E('Commands')).where({ requestID }));
 if (previous) {
  if (previous.orderID !== orderID || previous.actor !== user.id || previous.companyCode !== order.companyCode) reject(409, 'Idempotency key belongs to another command');
  return JSON.parse(previous.response);
 }
 if (order.status !== 'DRAFT' || order.revision !== expectedRevision) reject(409, 'Order changed or already released');
 const items = await tx.run(SELECT.from(E('SalesOrderItems')).where({ order_ID: orderID }));
 if (!items.length || items.some(item => !Number.isInteger(item.quantity) || item.quantity <= 0)) reject(422, 'Order needs positive item quantities');
 const customer = await tx.run(SELECT.one.from(E('BusinessPartners')).where({ ID: order.customer_ID }));
 if (!customer || customer.blocked || customer.companyCode !== order.companyCode) reject(422, 'Customer is unavailable');
 const total = Number(order.total);
 if (!Number.isFinite(total) || total <= 0) reject(422, 'Order total must be positive');
 // Atomic predicates guard concurrent releases; a later failure rolls everything back.
 const claimed = await tx.run(UPDATE(E('SalesOrders')).set({ status:'RELEASED', revision:expectedRevision + 1 }).where({ ID:orderID, status:'DRAFT', revision:expectedRevision }));
 if (claimed !== 1) reject(409, 'Concurrent order modification');
 const credit = await tx.run(UPDATE(E('BusinessPartners')).set({ exposure:{ '+=':total } }).where({ ID:customer.ID, blocked:false }).and('exposure +', total, '<= creditLimit'));
 if (credit !== 1) reject(422, 'Credit limit exceeded');
 for (const item of items.sort((a,b) => `${a.material_ID}:${a.plantCode}`.localeCompare(`${b.material_ID}:${b.plantCode}`))) {
  const allocated = await tx.run(UPDATE(E('Stock')).set({ available:{ '-=':item.quantity }, reserved:{ '+=':item.quantity }, revision:{ '+=':1 } }).where({ material_ID:item.material_ID, plantCode:item.plantCode, companyCode:order.companyCode }).and('available >=', item.quantity));
  if (allocated !== 1) reject(409, 'Insufficient available stock');
  await tx.run(INSERT.into(E('Reservations')).entries({ ID:cds.utils.uuid(), order_ID:orderID, material_ID:item.material_ID, plantCode:item.plantCode, quantity:item.quantity, status:'RESERVED' }));
 }
 const response = { ID:orderID, status:'RELEASED', revision:expectedRevision + 1 };
 await tx.run(INSERT.into(E('CreditDecisions')).entries({ ID:cds.utils.uuid(), order_ID:orderID, decision:'APPROVED', exposureBefore:customer.exposure, limit:customer.creditLimit, reason:'Atomic credit-limit check' }));
 await tx.run(INSERT.into(E('IntegrationEvents')).entries({ ID:cds.utils.uuid(), topic:'enterprise.order.released.v1', aggregateID:orderID, payload:JSON.stringify({ ...response, companyCode:order.companyCode }), status:'PENDING', attempts:0 }));
 await tx.run(INSERT.into(E('AuditEvents')).entries({ ID:cds.utils.uuid(), actor:user.id, action:'ORDER_RELEASED', aggregateID:orderID, companyCode:order.companyCode, correlationID:requestID, detail:'Credit and stock reserved in one transaction' }));
 await tx.run(INSERT.into(E('Commands')).entries({ requestID, orderID, actor:user.id, companyCode:order.companyCode, response:JSON.stringify(response) }));
 return response;
}
module.exports = { releaseOrder };

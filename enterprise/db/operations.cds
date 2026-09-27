namespace enterprise;
using { cuid, managed } from '@sap/cds/common';
entity IntegrationEvents: managed { key ID: UUID; companyCode: String(4); topic: String(100); aggregateID: UUID; payload: LargeString; status: String(20) default 'PENDING'; attempts: Integer default 0; nextAttemptAt: Timestamp; deliveredAt: Timestamp; leaseToken: UUID; leaseExpiresAt: Timestamp; }
entity Commands: managed { key requestID: String(80); orderID: UUID; actor: String(255); companyCode: String(4); response: LargeString; }
entity Incidents: cuid, managed { externalEventID: String(100); source: String(40); companyCode: String(4); service: String(100); severity: String(12); status: String(20); summary: String(300); correlationID: String(100); acknowledgedBy: String(255); }
entity MonitoringEvents: managed { key externalEventID: String(100); incident_ID: UUID; receivedAt: Timestamp; }
entity ServiceObjectives: cuid { service: String(100); targetAvailability: Decimal(6,3); maxLatencyMs: Integer; owner: String(100); }
entity AuditEvents: cuid, managed { actor: String(255); action: String(80); aggregateID: UUID; companyCode: String(4); correlationID: String(100); detail: String(300); }
entity ReconciliationRuns: cuid, managed { system: String(80); startedAt: Timestamp; finishedAt: Timestamp; expectedCount: Integer; actualCount: Integer; status: String(20); }
entity DeadLetters: cuid, managed { event: Association to IntegrationEvents; reason: String(300); resolved: Boolean default false; }

entity BusinessCommands: managed { key requestID: String(80); actor: String(255); companyCode: String(4); fingerprint: String(64); action: String(80); response: LargeString; }

entity ExternalIdentifiers { key companyCode: String(4); key sourceSystem: String(40); key objectType: String(30); key externalID: String(80); internalID: UUID not null; }

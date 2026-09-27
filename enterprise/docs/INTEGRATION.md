# Integration boundaries

The executable CAP core is independent of SAP tenant credentials. Production profiles require HANA and XSUAA service bindings. Mock identities are development-only. Assign companyCode through identity administration; do not trust a request's companyCode without matching the authenticated principal.

Cloud ALM owns monitoring configuration, events and webhooks; this application consumes a **normalized internal contract** through `ingestMonitoringEvent`. Configure your Cloud ALM tenant and Integration Suite mapping using the actual event schema for that tenant. The JSON schema here describes this application's input, not SAP's upstream API. OAuth and destination bindings must be configured before connecting external systems.

The `.iflw` files are BPMN design sources marked `isExecutable=false`. They provide explicit branches for structural analysis. They are not exported, deployable Integration Suite packages. Model the destinations, authentication, retries and exception subprocess in the tenant, then export the actual package for deployment.

Order release persists an outbox record in the same database transaction. `deliverBatch` accepts a transport implementation and is tested using injected transports. The helper claims atomic expiring leases, recovers expired work and protects acknowledgements with lease tokens, so concurrent workers cannot acknowledge each other's deliveries. Supply a scheduler and real transport binding. Delivery is at least once: the downstream consumer must deduplicate the event ID. No worker or external publisher is automatically started by this sample.

ABAP operational reports are classic/on-premise examples. The Cloud-native CAP extension uses application-owned models. ABAP source activation, DDIC resolution, S/4 released API eligibility, authorizations, and SAP job scheduling require a matching system and are not validated by local Node tests.

The executable inbound runtime under `integration/runtime/` accepts signed bounded ORDERS05, SOAP delivery and payment CloudEvent profiles through a typed CAP action. External-ID mappings, company and business-role checks, timestamp/signature validation and transaction-bound replay receipts are exercised in the business integration tests. This local contract does not imply a deployed native SOAP endpoint or an Integration Suite tenant transport.

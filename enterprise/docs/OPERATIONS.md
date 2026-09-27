# Operating and qualifying the sample

## Locally reproducible

Node 22 or newer. From `enterprise/`:

```sh
npm ci
npm test
npm run check:model
npm run build
npm start
```

The development profile uses an in-memory SQLite database and synthetic CSV data. It provides mock identities `planner` and `operator`; use the generated service index to inspect available endpoints. The Fiori entry point is `/controltower/webapp/index.html`. Assign the Viewer role alongside Planner for order reads, and the correct companyCode attribute. Production uses XSUAA and HANA bindings instead of mock identities.

## Deployment configuration

`mta.yaml` describes CAP server, transactional HDI deployer, native analytics HDI deployer, and app router. Supply XSUAA role assignments and company attributes. Review plans, quotas, network controls, OAuth destinations and retention for the target subaccount. Build output goes into `dist/`, which is excluded from source analysis to avoid counting generated tables twice.

## Qualification still required

- Deploy and execute native SQLScript in the intended HANA Cloud revision; validate query plans, contention and isolation.
- Activate ABAP/DDIC/CDS/DCL/service objects in a matching SAP system and run ATC/ABAP Unit.
- Validate actual S/4 released APIs and migration constraints for the target product release.
- The local integration runtime executes the bounded IDoc/SOAP/payment profiles through a CAP action. Configure and export Integration Suite transports, validate Cloud ALM mappings and supply real OAuth bindings separately.
- Validate Fiori interaction, XSUAA role assignments and HTTP authentication with a live identity provider.
- Add durable outbox worker scheduling, transport bindings and operational reconciliation. The provided worker uses atomic expiring leases, crash recovery and bounded retries. Delivery is at-least-once; receivers must deduplicate event IDs.
- Exercise load, disaster recovery, backups, secret rotation, audit retention and data residency controls.

The local tests establish business-rule and transaction behavior on SQLite; they do not certify HANA runtime performance, SAP activation, compliance, or enterprise production readiness.

## Business authorization and integrations

All action roles have XSUAA scopes and role templates with companyCode. IntegrationOperator is an additional role, not a bypass for Planner, Warehouse or Accountant. Set SAP_INTEGRATION_SIGNING_KEY to at least 32 bytes; no default secret is provided. Messages are timestamp-bound, signature-checked and processed transactionally. The XML profiles reject DTD/entity declarations. Review the exact bounded profiles under integration/contracts before using partner messages.

## Validation and maintenance

The source ABAP tests execute typed policies and reducers. The target compares generated SQL semantics against actual source ABAP execution over 620 deterministic cases, including empty sets, organizational filters, status combinations and padding. SQLite is the local SQL test engine; native HANA activation and performance remain unverified.

The nine maintenance cases use the existing SAP maintenance playbook and real local business regression. Stack, add-on, rehearsal and correction inputs are synthetic. A synthetic assessment cannot authorize connected execution. Failure recovery restores only the local model; it is not evidence of native SAP rollback.

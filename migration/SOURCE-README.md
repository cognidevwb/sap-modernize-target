# SAP enterprise modernization source

Open this folder in CogniDev and choose **Understand it → SAP**. Re-analyze an already open project. The SAP cards expose objects, typed contracts, data access, integrations, business groupings, modernization plans and external jobs. Use Cases and Guided Tour add saved model-generated interpretations with source references.

This is a coherent company-scoped reference landscape with executable business behavior, migration recipes and failure cases. The earlier empty/repeated ABAP fixture classes have been retired; their inventory and baseline commit are in `migration/retired-fixtures.json`.

## Business and integration scope

- Sales order creation, credit/stock reservation, picking, shipping, invoicing, exact-decimal tax, balanced journals, partial payments and returns.
- Purchasing with creator/approver separation, partial receipts, quality inspection and stock release; BOM-based production with yield/scrap reconciliation.
- Inventory transfers/counts, effective-dated pricing, master data and credit controls.
- Signed IDoc order intake, SOAP delivery messages and payment CloudEvents, explicit external-ID mapping, company/role checks and replay protection.
- A transactional outbox with atomic worker leases, crash recovery, bounded retries and dead-letter handling; receivers still deduplicate at-least-once deliveries.
- A real C# settlement job reading a parameterized SQL extract and bank CSV, producing immutable reconciliation reports.
- Typed ABAP domain policies and ten executable ABAP analytical reducers; DDIC exports, CDS/DCL, service bindings, jobs and authorization examples.
- HANA HDI tables/views/procedures/functions, CAP services, Fiori source, BTP/XSUAA/app-router descriptors and Integration Suite design artifacts.

## Reproduce the checks

Requires Node 22+, Python 3 and .NET 9. The generated target requires .NET 10.

```sh
cd enterprise
npm ci
npm test
npm run check:model
npm run build
cd ../validation/abap
npm ci
npm test
cd ../..
dotnet run --project external/settlement/tests/SapSettlement.Tests
python3 operations/maintenance/run-scenarios.py --playbooks /path/to/playbooks-v2
```

Development CAP uses SQLite and mock identities; production declares HANA/XSUAA bindings. `enterprise/xs-security.json` includes the business roles and company attribute. Assign least-privilege roles per workflow; integration identities need IntegrationOperator and the corresponding business role.

## Generate and validate the target

Run the existing **SAP HANA Modernization** playbook. Its qualified repository recipe reads `migration/modernization.json`, validates the source, compiles ten bounded pure ABAP reducers to SQLScript/AMDP, migrates the C# job to .NET 10 OAuth/OData, tests both implementations and automatically runs target Understand. A staged target is promoted only after local checks pass; a prior target is backed up. Modified plans or receipts are rejected.

The generated target includes file-level differences, 620 source-versus-SQL calculation cases and validation evidence under `migration/`. Run **SAP Validation and Cutover** to rerun the local validation cycle. Native SAP activation, native HANA execution, exact SAP release/API compatibility and production acceptance remain separate gates.

`migration/scenario-coverage.json` maps all 124 service scenarios to explicit acceptance and demo evidence. Coverage of the catalog does not mean all 124 migrations have been executed. `operations/maintenance/` exercises FPS/SPS, incompatible add-ons, failed regression, correction ownership, stale inputs and failure recovery through the existing playbook using clearly marked synthetic SAP stack evidence.

See `enterprise/docs/ARCHITECTURE.md`, `enterprise/docs/OPERATIONS.md`, `enterprise/integration/README.md` and `external/settlement/README.md`. Model reports in `.cognidev/understand/` describe source evidence; they do not establish deployed SAP behavior.

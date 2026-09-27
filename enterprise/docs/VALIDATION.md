# Validation scope

The executable repository checks cover the business reference application and its generated modernization target. They do not establish native SAP deployment or production readiness.

| Check | Source | Generated target |
|---|---:|---:|
| CAP business, integration, outbox and deployment-contract tests | 62 | 62 |
| Executed ABAP policy/reducer checks | 61 | 61 source-reference checks |
| C# settlement worker checks | 18 | 28 |
| ABAP-versus-generated-SQL comparison cases | Baseline implementation | 620 |
| Maintenance success, rejection and recovery scenarios | 9 | 9 |

CAP model compilation and production builds pass. Production configuration declares HANA/XSUAA; local business tests run on SQLite. The .NET source tests execute real SQL extraction and CSV reconciliation. Target tests exercise OAuth/OData behavior and compare canonical business results with the SQL baseline.

The migration executor rejects unsupported ABAP constructs, stale plans and changed target/evidence files. It builds in staging, retains a prior target backup, runs Understand automatically and writes hash-bound comparison, equivalence, validation and receipt reports under the target's migration/ directory. The Validation and Cutover playbook reruns the local checks.

The existing maintenance executor is exercised with synthetic SAP stack, compatibility, correction and rehearsal inputs and the real local business regression. Synthetic evidence cannot authorize connected execution. Failure recovery restores a local model; native SUM rollback is not proven.

## Understand and model reports

The expanded source yields 121 SAP inputs and 156 engineering entities. The generated target yields 131 SAP inputs and 176 engineering entities, including ten additional SQLScript procedures and their typed contracts. The CAP view contains 54 entities and 15 services. C# settlement code is explicitly project-owned in .gitattributes and participates in the shared structural analysis.

CogniDev SAP detail cards, source/target changes, validation gates and HANA contracts were browser-checked at desktop and 375-pixel width. Source links and long names do not overlap or create horizontal overflow. Structural coverage remains partial where standard SAP objects and runtime dependencies are not present in the export.

Saved Use Cases and Guided Tour reports are model-inferred interpretations. Their citation paths and file-tag hashes are checked; counts and generation provenance are recorded in .cognidev/demo-analysis.json. An inferred description is not a runtime certification.

## Native gates still outstanding

SAP activation/ATC, native HANA deployment and SQLScript execution, exact installed-release/API compatibility, live XSUAA/Cloud ALM/Integration Suite connectivity, load testing, native rollback and production acceptance require an appropriate SAP environment. Integration design files are not deployable tenant exports; the bounded local IDoc/SOAP/event adapters are executable separately.

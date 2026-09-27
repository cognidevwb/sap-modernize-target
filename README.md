# SAP enterprise modernization target

Open this folder in CogniDev → Understand it → SAP. Source-to-target changes, validation gates and external job cards show the generated repository evidence.

The target preserves the business services, integration adapters and domain policies. Ten qualified pure ABAP reducers become read-only HANA SQLScript plus AMDP entry points; source reducers remain validation-only references. The real settlement worker moves from .NET 9 direct SQL to .NET 10 OAuth/OData with scoped pagination, retries and exact-decimal reconciliation.

See migration/TARGET-CHANGES.md, migration/comparison.json and migration/validation.json. The SAP Validation and Cutover playbook reruns business tests, ABAP reference tests, worker tests, 620 equivalence cases, maintenance scenarios and Understand. Native ABAP activation, native HANA execution, exact release/API compatibility and operational acceptance remain unrun gates.

Build commands and business scope are preserved in migration/SOURCE-README.md; use .NET 10 for the target worker. Run `npm ci` in enterprise and validation/abap before local checks on a fresh clone. Production configuration requires actual SAP/HANA/XSUAA resources.

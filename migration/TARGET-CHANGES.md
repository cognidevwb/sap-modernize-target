# Applied repository modernization

The target preserves the CAP business services and their tests. 10 typed ABAP reducers have been compiled to read-only HANA SQLScript with AMDP callers. Source copies are validation-only fixtures.

The settlement worker moves from .NET 9 direct database reads to .NET 10 authenticated, tenant-scoped OData reads. Database provider code remains only in regression tests. OAuth caching, endpoint-bound pagination, bounded retries and response validation are tested.

See migration/validation.json for executed checks and migration/comparison.json for file-level differences. Native SAP activation, native HANA deployment, SAP compatibility and production readiness require connected-system evidence.

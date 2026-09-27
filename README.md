# SAP modernization target — structural-analysis demo

A synthetic ABAP example illustrating a possible modernization direction. This repository is a demo fixture, not a deployed or certified S/4HANA system.

## Explore in CogniDev

Open this folder and choose **Understand**. Structural analysis runs automatically; no separate SAP playbook needs to be started. Open the **SAP** subsection for smaller cards covering classes, data entities, dependencies, database access, functional areas, transactions, and coverage. **Source files & tags** retains source-folder groups and parsed symbol types; functional-area inferences are labeled separately from observed facts.

- 90 ABAP source files across ten business areas.
- 10 CDS view definitions, using the abapGit `.ddls.asddls` filename convention.
- Examples of BAPI calls and CDS-based reads, for comparison with `sap-modernize-source`.

Inspect classes, routines, database accesses, and source links. SAP APIs and placeholder standard entities are external dependencies and may remain unresolved in this export.

Analysis artifacts are generated locally and are not committed to this repository.

## Scope

Static source analysis does not establish Clean Core compliance, release compatibility, deployment status, test coverage, migration completion, or runtime behavior. No SAP runtime test results are included. RAP services and Fiori applications are not implemented by this fixture.

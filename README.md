# SAP modernization target — structural-analysis demo

A synthetic ABAP example illustrating a possible modernization direction. This repository is a demo fixture, not a deployed or certified S/4HANA system.

## Explore in CogniDev

Open this folder and choose **Understand**. Structural analysis runs automatically; no separate SAP playbook needs to be started. Open the **SAP** subsection for smaller cards covering classes, data entities, dependencies, database access, functional areas, transactions, and coverage. **Source files & tags** retains source-folder groups and parsed symbol types; functional-area inferences are labeled separately from observed facts.

- 90 ABAP source files across ten business areas.
- 10 CDS view definitions, using the abapGit `.ddls.asddls` filename convention.
- Examples of BAPI calls and CDS-based reads, for comparison with `sap-modernize-source`.

Inspect classes, routines, database accesses, and source links. SAP APIs and placeholder standard entities are external dependencies and may remain unresolved in this export.

Structural analysis is generated locally. The model-generated use cases and guided tour are included for the demo.

## Scope

Static source analysis does not establish Clean Core compliance, release compatibility, deployment status, test coverage, migration completion, or runtime behavior. No SAP runtime test results are included. RAP services and Fiori applications are not implemented by this fixture.

## Model-generated demo reports

The existing **Use Cases** and **Guided Tour** cycles were run with Claude Sonnet. Open Understand to load the saved views; structural analysis rebuilds locally. See [.cognidev/DEMO_ANALYSIS.md](.cognidev/DEMO_ANALYSIS.md) for provenance, validation and interpretation limits. These are source-inferred reports, not proof of deployed functionality.

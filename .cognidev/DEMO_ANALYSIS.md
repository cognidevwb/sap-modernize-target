# SAP demo model analysis

Generated with the existing `understand-brief` and `reading-guide` cycles using `claude-cli / sonnet`, then reviewed against source implementations. The original model report, correction log and explicitly added source-review cases are retained in demo-analysis.json.

- 32 reviewed source-inferred use cases (including explicitly recorded source-review additions).
- 37 reading steps; 36 cached file tags.
- All cited files exist and all cached tag hashes match this source snapshot. No fallback tags.
- Tool hashes, evidence hashes and report hashes are recorded in [demo-analysis.json](demo-analysis.json).

## Opening a clone

Open the repository in CogniDev and choose Understand. Structural analysis rebuilds locally; the saved Use Cases and Guided Tour reports are retained. Model refreshes remain explicit.

## Interpretation

These are model-generated source interpretations, not certification, runtime validation, or proof that every described workflow is implemented. The model's wording may describe the intended ERP domain more broadly than this synthetic demo implements. An entity declaration alone does not prove an end-to-end business operation. Source references were checked for existence; semantic correctness still requires review.

Portable model reports and the current tour file-tag cache are committed alongside the source and migration evidence. Structural caches, local provider logs, credentials, dependencies, and build output are excluded. The source contains the executable enterprise reference landscape; the target contains the generated HANA/AMDP calculations and .NET 10 OAuth/OData worker, with hash-bound local validation evidence under migration/.

## Use cases supported only by declarative citations

None identified by the declarative-file check; this is not a runtime verification.

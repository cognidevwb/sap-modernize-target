# Maintenance demonstration

Run `python3 operations/maintenance/run-scenarios.py --playbooks /path/to/playbooks-v2` from the project root. `--output PATH` keeps rerun evidence outside the source snapshot when validating a target.

The runner executes the business baseline, invokes the existing `sap-maintenance-cycle` plan/execute/verify scripts and asserts nine success, rejection and recovery outcomes defined in scenarios.json. Results include current business test counts and the actual source artifact inventory. FPS/SPS labels and all connected SAP compatibility/rehearsal inputs are synthetic; no SAP Note number or production approval is fabricated.

A release change is handed to the release-upgrade playbook. Incompatible add-ons, failed regression, unowned corrections, stale input evidence and synthetic connected execution are rejected. A post-processing failure restores the prior local model. Native SUM, native rollback and release compatibility are not executed by these tests.

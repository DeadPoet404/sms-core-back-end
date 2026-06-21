# Active Work: Staff & HR Governance

## Current Status
* **Module 1: Staff Registration & Ingestion Pipeline** — COMPLETE (Verified validation & security gates).
* **Module 2: Department Allocation & Workload Tracking** — COMPLETE (Verified workload limiting and multi-tenant blocks).
* **Module 3: Operational Access & Activity Logger** — COMPLETE (Verified immutable cross-tenant audit trails).
* **Moving to:** Module 4: HR Executive Utilization Dashboard.

## Target Module 4: Executive Utilization Dashboard
* Build an aggregate analytical engine (`src/features/staff/dashboard.ts`) to calculate administrative telemetry metrics per school tenant.
* Metrics computed: Total Headcount, Role Distribution Breakdown, and Total Combined Monthly Payroll Liability.
* Guarantee secure tenant boundaries: metrics must cleanly scope records matching exclusively the admin's verified `tenantId`.

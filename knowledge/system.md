# System Map: Multi-Tenant School Management System Backend

## Architectural Pillars
1. **API-First Design:** Every backend capability is exposed via clean, stateless REST/JSON endpoints.
2. **Strict Tenant Isolation:** Every database entity belongs to a specific school (`tenantId`). Cross-tenant leakage is prevented at the global middleware/query-builder level.
3. **Granular RBAC:** Permissions are programmatic strings evaluated against a user's active session profile.

## System Boundaries & Directory Layout
* `src/shared/`: Cross-cutting concerns (Database connection pool, multi-tenant guardrails, cryptography, unified error handlers).
* `src/features/auth/`: Session management, token generation, cryptographic verification.
* `src/features/students/`: Enrollment transaction engine, leave pipelines, historic registers, attendance tracking.
* `src/features/finance/`: Dynamic billing, payment registry, operational expense logs, faculty payroll engine.
* `src/features/operations/`: Class placement, conflict-free scheduling engine, track routing.
* `src/features/staff/`: Employment tracking, subject-to-teacher workload mappings.
* `src/features/analytics/`: Server-aggregated metric processors, data streaming pipelines (CSV/PDF).

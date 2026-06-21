# Frontend-Backend Alignment Ledger

## Objective
Verify that the generated Prisma schema and feature engines perfectly satisfy the data requirements, user roles, and UI states of the frontend application components.

## Application Route Map & Backend Entity Alignment
* `/app/dashboard` -> High-Level Metrics (Aggregations across all models)
* `/app/finance` -> Billing Ledger (`FeeInvoice`, `FeeItem`, Payroll arrays)
* `/app/operations` -> Timetable Layout Matrix Configurations (`TimetableMatrix`)
* `/app/students` -> Student Registries & Progress Tracking (`Student`, `ClassSection`)
* `/app/staff` & `/teachers` -> Personnel, Workloads, and Compliance (`StaffProfile`, `User`)

## Component Verification Status
* **App Directory Structure Map** — RECORDED
* **dashboard/page.tsx** — VERIFIED
* **finance/page.tsx** — VERIFIED
* **staff/page.tsx** — REFINEMENT_REQUIRED
* **staff/add/page.tsx** — REFINEMENT_REQUIRED
* **students/page.tsx** — REFINEMENT_REQUIRED
  - *Payload Shape:* Flattened data row mapping core identity, analytics cache layers, and financial rollups.
  - *Gap Detected:* Current database structure lacks fields for real-time statistical caching (`currentGpa`, `overallAverage`, `classRank`), direct attendance tracking aggregates, and consolidated financial parent-relations.
  - *Resolution Blueprint:* Implement a combination of transactional fields and dedicated analytical tables to provide clean data to the component without causing performance bottle-necks during heavy filtering operations.
* `/app/students/enroll/page.tsx` — VERIFIED_WITH_TRANSACTION_CONTRACT
  - *Payload Shape:* Multi-step payload nesting user accounts, demographic objects, class assignments, guardian entities, and initial ledger cash deposits.
  - *Gap Detected:* Standard single-row database queries will cause partial-write data corruption if network disconnects happen mid-stream.
  - *Resolution Blueprint:* Route incoming payloads through a secure isolated Prisma `$transaction` pipeline to guarantee all tables write successfully or roll back safely together.
* `/app/students/leave/page.tsx` — VERIFIED_WITH_LIFECYCLE_CONTRACT
  - *Payload Shape:* Multi-field request mapping relational student keys, categorical type enums, date boundaries, text summaries, and file upload references.
  - *Gap Detected:* The engine needs an isolated state model tracking system to log document links, process state updates, and record staff approval IDs.
  - *Resolution Blueprint:* Implement a dedicated `LeaveRequest` table with relationship links to student and staff tracking models, integrated with asset upload paths.
* `/app/staff` & `/teachers` — VERIFIED_WITH_NORMALIZED_LEDGERS
  - *Payload Shape:* Consolidated row flattening HR files, qualification status, scheduling indicators, and local payroll rows.
  - *Gap Detected:* Real-time scheduling limits and localized tax profiles (GRA/SSNIT compliance inputs) require separate database tables to avoid schema duplication.
  - *Resolution Blueprint:* Implement specialized tables for `StaffProfile`, `AcademicAssignment`, and `PayrollRecord` connected by relational keys, ensuring automated database aggregations compute structural totals dynamically.
* `/app/teachers/add/page.tsx` — DESIGN_INDEXED
  - *Purpose:* Dedicated form layout processing incoming staff account creation, department routing, and local compliance tax records.
* `/app/teachers/exit/page.tsx` — DESIGN_INDEXED
  - *Purpose:* Offboarding workspace managing classroom handover matrices, contract closures, and final payroll payouts.

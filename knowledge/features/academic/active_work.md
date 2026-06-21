# Active Work: Academic Infrastructure

## Current Status
* **Module 1: Class & Course Catalog** — COMPLETE (Verified cross-domain isolation boundaries).
* **Module 2: Timetable & Schedule Engine** — COMPLETE (Synchronized with client-side matrix state parameters and multi-tenant mapping validated).
* **Moving to:** Module 3: Grading & Assessment Matrix.

## Target Module 3: Grading & Assessment Matrix
* Build an academic performance tracker (`src/features/academic/grading.ts`) capable of handling multiple continuous assessment components (e.g., Class Work, Mid-Term Exams, End of Term Exams).
* Implement weight-based aggregation math to compute final student percentage scores based on custom grade scales.
* Enforce absolute multi-tenant containment rules so grading actions are strictly bounded by user roles and specific school IDs.

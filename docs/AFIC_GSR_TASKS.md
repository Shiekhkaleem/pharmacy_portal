# AFIC GSR Task Breakdown

This task list converts the AFIC GSR proposal into implementation work packages. Status values should be kept current as the application evolves.

## Phase 1: Documentation and Scope Lock

| Task | Deliverable | Status |
| --- | --- | --- |
| Convert proposal to editable Markdown | `docs/AFIC_GSR_TECHNICAL_SOLUTION.md` | Done |
| Create implementation task register | `docs/AFIC_GSR_TASKS.md` | Done |
| Document current project state | `docs/CURRENT_PROJECT_OVERVIEW.md` | Done |
| Create detailed change plan | `docs/AFIC_GSR_IMPLEMENTATION_PLAN.md` | Done |
| Prepare Anx-C compliance mapping | Compliance summary in technical solution and implementation plan | Done |

## Phase 2: Backend Foundations

| Task | Requirement Coverage | Status |
| --- | --- | --- |
| Extend pharmacy users to support multiple module roles | Module 1 and Module 2 RBAC, multi-role users | Done |
| Extend immutable audit log action/entity values | Receipt, issue, return, consumption, report generation, admin changes | Done |
| Add admin-managed lookup model and API | Store locations, departments, procedures, patient categories, units, thresholds | Done |
| Add main medical store transaction model and API | Receipt, department-wise issue, stock taking, generic reports | Done |
| Add Cath Lab case and transaction models/API | Patient registration, wristband barcode, sub-store issue, live consumption, return/re-ingestion | Done |
| Add dashboard aggregation endpoints | Admin/executive visibility for stock, forecasts, item/procedure/doctor/patient-category views | Done |
| Add previous-consumption daily issue suggestion endpoint | Cath Lab minimum daily issue recommendations | Done |

## Phase 3: Frontend Foundations

| Task | Requirement Coverage | Status |
| --- | --- | --- |
| Add GSR suite route under pharmacy module | Integrated access point for Module 1 and Module 2 | Done |
| Add sidebar navigation entry | User access to the new suite | Done |
| Add Module 1 dashboard/workbench | Current stock, low stock, forecast, budget, receipt/issue forms | Done |
| Add Module 2 dashboard/workbench | Patient registration, issue, consumption, returns, daily suggestions | Done |
| Add lookup administration panel | Admin-managed lookup values | Done |
| Add generic search/report panel | Search, graph data and CSV export for report rows | Done |

## Phase 4: Remaining Production Hardening

| Task | Requirement Coverage | Status |
| --- | --- | --- |
| Add PDF/Excel/CSV export buttons to GSR tables | Downloadable reports and graphs | Partial: CSV export done; PDF/Excel pending |
| Add printable item barcode labels | Internal barcode generation and labels | Partial: internal item/batch codes generate; printable labels pending |
| Add printable Cath Lab wristband layout | Patient wristband barcode printing | Partial: wristband print layout done; graphical barcode rendering pending |
| Add chart visualizations for configurable x-axis reports | Graph builder and configurable x-axis | Partial: configurable x-axis bar visualization done; full chart builder pending |
| Add formal stock-taking screens | Scan-based stock taking | Done: stock-taking form records scanned/typed code and counted quantity |
| Add approval workflow for high-value/critical items | Unique selling feature | Pending |
| Add integration tests for GSR endpoints | Acceptance quality gate | Pending |
| Add seeded AFIC lookup values and demo workflow data | Prototype readiness | Pending |

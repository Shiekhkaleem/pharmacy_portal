# AFIC GSR Implementation Plan

## Implementation Scope

This plan maps the AFIC GSR requirements onto the existing project and identifies the implemented first-pass changes plus remaining production hardening.

## Data Model Changes

| Model | Purpose | Requirement Coverage |
| --- | --- | --- |
| `PharmacyUser` extension | Adds `pharmacyRoles` array while preserving legacy `pharmacyRole` | Multi-role assignment to a single user |
| `GsrLookup` | Stores admin-managed values by module and lookup type | Store locations, item types, departments, procedures, doctors, units and thresholds |
| `MedicalStoreTransaction` | Captures main medical store receipt, issue, adjustment, stock taking and report-generation events | Module 1 receipt/issue, department-wise issue, stock taking, audit trail |
| `CathLabCase` | Captures patient registration, procedure, doctor, patient type, wristband barcode and case status | Module 2 patient registration and wristband identification |
| `CathLabStockTransaction` | Captures Cath Lab receipt, sub-store issue, live consumption, returns and re-ingestion | Module 2 scan-based store workflows and patient-wise cost |

## API Changes

| Route Group | Main Endpoints | Purpose |
| --- | --- | --- |
| `/api/gsr/lookups` | `GET`, `POST`, `PUT`, `DELETE` | Lookup administration |
| `/api/gsr/main-store` | `/dashboard`, `/receive`, `/issue`, `/stock-taking`, `/reports/generic` | Module 1 workflows and reporting |
| `/api/gsr/cath-lab` | `/dashboard`, `/patients`, `/receive`, `/issue`, `/consume`, `/return`, `/daily-suggestions`, `/reports/generic` | Module 2 workflows and reporting |

## Frontend Changes

| File | Purpose |
| --- | --- |
| `client/src/pages/pharmacy/GsrInventorySuite.jsx` | Integrated GSR workbench for Module 1, Module 2, lookups and reporting |
| `client/src/App.jsx` | Adds `/pharmacy/gsr` protected route |
| `client/src/components/Sidebar.jsx` | Adds sidebar entry for the GSR suite |

## Requirement Traceability

| GSR Requirement | Implemented Coverage |
| --- | --- |
| Two modules | One integrated GSR suite with Main Store and Cath Lab tabs |
| Barcode/QR based item registration and lookup | Existing master medicine/batch barcode fields plus GSR barcode transaction fields |
| Internal code generation | Transaction and Cath Lab patient barcode generation utilities |
| Item receipt and issue | Main store `receive` and `issue` APIs |
| Store location and item metadata | Existing batch storage fields plus `GsrLookup` metadata and transaction locations |
| Department-wise issue | Main store issue transaction stores department and receiver |
| Low-stock alerts and forecasts | Dashboard aggregates low-stock, expiring and forecast quantities |
| Admin lookup values | GSR lookup CRUD API and frontend lookup panel |
| Role-based access and multi-role users | `PharmacyUser.pharmacyRoles` plus middleware support |
| Role dashboards | GSR dashboard panels plus existing pharmacy dashboard |
| Downloadable reports/graphs | Generic report endpoint, configurable x-axis bar visualization and CSV export are implemented; PDF/Excel export remains pending |
| Generic search and x-axis reports | Generic report endpoints accept `q`, `xAxis`, `module` and date filters |
| Patient registration | Cath Lab patient/case registration API and form |
| Wristband barcode | `CathLabCase.wristbandBarcode` generated during patient registration |
| Cath Lab receipt/source | Cath Lab receive transaction captures source, destination and scan code |
| Sub-store to procedure room issue | Cath Lab issue transaction captures sub-store, procedure room and nursing receiver |
| Live patient-wise consumption | Cath Lab consume transaction deducts stock and records patient/case cost |
| Return/re-ingestion | Cath Lab return transaction restores stock and clears nursing account quantity |
| Cost calculation | Cath Lab dashboard aggregates patient, procedure, doctor and overall expenditure |
| Daily issue suggestion | Cath Lab daily suggestion endpoint uses previous consumption history |
| On-premises isolated LAN | Runtime remains local Express/React/Mongo with no external feed dependency |

## Remaining Work Before Formal Acceptance

- Add PDF and Excel report export.
- Add printable item barcode label templates.
- Replace basic report bars with richer chart components if required by UAT.
- Add camera/scanner event integration where a hardware workflow is required beyond keyboard-wedge scanners.
- Add high-value/critical-item approval workflow.
- Add seed script for AFIC departments, procedures, item types and patient categories.
- Add automated API tests with an isolated Mongo test database.
- Run user acceptance sessions and lock scope after prototype approval.

# AFIC GSR Requirement Implementation Check

Checked against the provided AFIC GSR requirements and the current codebase.

Status legend:

- Done: implemented in backend and available through UI/API.
- Partial: foundation exists, but at least one expected production detail is still missing.
- Pending: not implemented yet.
- UAT: implemented but should be validated with AFIC users and real devices/data.

## Overall Result

The project now has a working first-pass implementation for the two required modules:

- Module 1: Main Medical Store Inventory Management
- Module 2: Cathology/Cath Lab Store Management

The implementation is not yet a final acceptance-ready build. The highest-risk remaining gaps are PDF/Excel export, printable item barcode labels, formal master-admin user management for module admins, full role-specific dashboards, integration tests, and UAT with real barcode scanners/printers.

## Module 1: Main Medical Store Inventory Management

| Requirement | Current Status | Evidence / Notes |
| --- | --- | --- |
| Handle registration, receipt and issue of complete medical inventory | Partial | Master medicine/batch registration exists in existing inventory; GSR receipt/issue APIs and UI exist. Full GSR item registration screen is still existing inventory, not inside GSR tab. |
| Register existing company barcode/QR codes against items | Done | `MasterMedicine` and `MasterMedicineBatch` support barcode/QR fields; GSR APIs accept scan code. |
| Generate own barcode for items without company barcode | Done | `MasterMedicine` and `MasterMedicineBatch` now generate internal AFIC item/batch barcodes when missing. |
| Populate metadata on barcode/QR scan | Partial | Barcode lookup and transaction lookup work by scan code; the GSR forms do not yet auto-fill a preview panel before submit. |
| Register/receive by store location, medical store type, potency, distribution mechanism, packaging unit, accounting quantity, dosage method, price, expiry | Partial | Batch model covers price, expiry, storage and quantities; GSR transaction metadata supports the additional values. Dedicated UI fields for every metadata value are not all exposed yet. |
| Issue medical items department-wise | Done | Main store issue captures department, receiver and location. |
| Track low stock hospital-wise, department-wise and item-wise with notification methodology | Partial | Low-stock dashboard counts and item aggregates exist. In-app notification workflow is not yet implemented for all perspectives. |
| Admin dashboard and management sub-module | Partial | GSR dashboard and lookup admin exist. Full administrative management module is not final. |
| Key values manageable through lookup values | Done | `GsrLookup` model/API and UI panel support admin-managed lookup values. |
| User role-based access | Done | Protected GSR routes use pharmacy RBAC. |
| Add users and assign roles | Partial | Existing user/pharmacy user structures support roles; a dedicated GSR module-admin user management screen is not implemented. |
| Assign multiple roles to one user | Done | `PharmacyUser.pharmacyRoles` and middleware multi-role checks are implemented. |
| Comprehensive graphs for current stock, demand forecast, department issue, consumption, budget | Partial | Dashboard aggregates and basic report bars exist. Rich chart components and all executive graph variants remain UAT/polish work. |
| Every role/user has own dashboard | Partial | One GSR suite adapts by permissions; separate dashboard pages per role are not complete. |
| Reports/graphs downloadable | Partial | CSV report export is implemented. PDF/Excel and graph image export are pending. |
| Forecast items, generate demands, display stock positions and approximate budgets | Partial | Dashboard calculates stock, approximate budget and basic forecast. Formal demand-generation workflow is pending. |
| Generic search based on data parameters | Done | Generic report APIs support search and filters. |
| Reports/graphs based on generic search with definable x-axis | Done | Generic report endpoints and UI support x-axis selection with bar visualization. |
| Additional unique selling features | Partial | Expiry/low stock, audit trail and import foundations exist. Approval workflow and executive snapshots remain pending. |

## Module 2: Cathology/Cath Lab Store Management

| Requirement | Current Status | Evidence / Notes |
| --- | --- | --- |
| Separate admin and management sub-module | Partial | Cath Lab tab, APIs and role set exist. Full separate admin console is pending. |
| Role-based access | Done | Cath Lab routes use pharmacy RBAC with Cath Lab roles. |
| Add users and assign roles | Partial | Multi-role support exists; dedicated UI for module admin user creation is pending. |
| Assign multiple roles to one user | Done | `PharmacyUser.pharmacyRoles` implemented. |
| Register patients by type, procedure, doctor and basic info | Done | Cath Lab patient/case registration API and UI are implemented. |
| Print barcode at patient registration for wristband | Partial | Wristband barcode is generated and printable from registered cases. Graphical barcode rendering on the wristband is pending. |
| Receive Cath Lab stores by source using barcode/QR scanning | Done | Cath Lab receive API and UI accept scan code, quantity, source, sub-store and room. |
| Place/issue items location-wise in receipt sub-module | Done | Cath Lab receive captures sub-store/procedure room; issue captures room and nursing account. |
| Issue from sub-stores to procedure rooms against nursing individual | Done | Cath Lab issue records sub-store, procedure room, nurse and nursing account. |
| Keep live record of items used on patient and account patient-wise | Done | Consumption records link to Cath Lab case, doctor, procedure and patient type. |
| Re-ingest unused/reused items | Done | Return endpoint supports normal return and reused/re-ingested flag. |
| Calculate expenditure overall, procedure-wise and patient-wise | Partial | Overall, doctor and procedure aggregates exist; patient-wise detailed cost reporting should be expanded in UI. |
| Running stock and forecast low stock store/item-wise | Partial | Existing batch stock and low-stock status exist. Store-wise Cath Lab stock forecast needs more detailed sub-store inventory reporting. |
| Suggest minimum daily issue to procedure rooms from history | Done | Daily suggestions endpoint and UI panel are implemented. |
| Stock taking, issue receipt and expense barcode/QR scan based, identified from main medical store DB | Partial | Workflows accept scan codes and use master batch DB. Dedicated Cath Lab stock-taking UI is pending. |
| Return items end-of-day from nursing assistants and restore sub-store stock | Done | Return flow restores batch stock and records nurse/sub-store context. |
| Every role/user has own dashboard | Partial | Shared Cath Lab dashboard exists; separate dashboards per role are pending. |
| Administrative dashboard item/doctor/procedure/low stock/daily stock/patient category views | Partial | Most aggregates exist; daily stock state by store/sub-store needs richer UI/reporting. |
| Generic report with definable x-axis | Done | Cath Lab generic report supports configurable x-axis. |
| Reports and graphs downloadable | Partial | CSV export is implemented. PDF/Excel and graph export are pending. |
| Master admin page for module admins | Partial | Existing super-admin and role model foundations exist; GSR-specific master admin screen is pending. |

## Deployment and Development Constraints

| Requirement | Current Status | Evidence / Notes |
| --- | --- | --- |
| On-premises isolated LAN deployment | Done | App is Node/React/Mongo and can run on AFIC LAN/VMs. |
| No internet-based software/feed | Done | Runtime does not require internet feeds for GSR workflows. |
| Common programming language/resources available | Done | JavaScript/React/Node/Express/MongoDB stack. |
| Web-based on AFIC virtual platforms | Done | Existing web deployment architecture supports this. |
| Responsive for PCs, laptops, Android and tablets | Partial | React/Tailwind responsive UI exists. Device-specific testing is still needed. |
| User friendliness and smooth functioning | UAT | UI is implemented, but this needs user acceptance with AFIC store, nursing and admin users. |

## Remaining Must-Fix Before Final Acceptance

1. PDF and Excel export for GSR reports.
2. Printable item barcode labels with actual barcode graphics.
3. Graphical barcode rendering on Cath Lab wristbands.
4. GSR-specific master admin page for module admin creation/assignment.
5. Patient-wise detailed expenditure UI/report.
6. Cath Lab sub-store daily stock state report.
7. Dedicated Cath Lab stock-taking screen.
8. Automated backend integration tests with test MongoDB.
9. Real scanner/printer validation on AFIC hardware.


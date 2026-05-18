# AFIC GSR Technical Solution Document

Client: AFIC, Rawalpindi  
Bidder: Blink Information Technologies  
Submission: Soft copy and hard copy as required  
Last Date of Submission: 22 May 2026  
Soft Copy Email: gso2it@afic.gov.pk  
Document Status: Editable draft for company details, signature, and pricing

## 1. Executive Summary

Blink Information Technologies proposes an on-premises, web-based, responsive Medical Stores and Cathology/Cath Lab Stores Management System for AFIC, Rawalpindi. The proposed suite contains two integrated modules:

- Module 1: Main Medical Store Inventory Management
- Module 2: Cathology Lab Store Management

The solution is designed to satisfy the GSR requirements, including barcode/QR based receipt, issue, stock taking, live patient-wise consumption, forecasting, dashboards, downloadable reports, generic search, configurable graph axes, master administration and role-based access.

The system will operate entirely inside AFIC's isolated LAN environment and will not depend on internet-based services or external feeds. It will be deployed on AFIC-provided virtual platforms and delivered on turnkey basis with installation, commissioning, master-trainer training, and 1-year service-level support included.

## 2. Proposed Solution Architecture

| Layer | Proposed Component | Compliance Benefit |
| --- | --- | --- |
| Client Layer | Responsive web interface for PCs, laptops, tablets, and Android devices | Supports multi-device use in stores, procedure rooms, and management offices |
| Application Layer | Modular web application with Master Admin, Module 1, and Module 2 | Separate administration while retaining one integrated suite |
| Database Layer | Centralized relational or document database hosted on AFIC on-premises virtual server | Single source of truth for item master, codes, stock, patients, issues, returns, and reports |
| Barcode/QR Layer | Scan, generate, and print item labels and patient wristband barcodes | Scan-based receipt, issue, stock taking, and patient identification |
| Reporting Layer | Dashboards, generic search, graph builder, exports to PDF/Excel/CSV | Downloadable reports and configurable x-axis graphs |
| Security Layer | RBAC, multi-role users, audit logs, administrative lookup management | Controlled access and transaction traceability |

## 3. Module 1: Main Medical Store Inventory Management

Module 1 will manage complete medical inventory registration, item receipt, department-wise issue, stock status, low-stock notifications, forecasting and budget approximation. It will register existing manufacturer barcodes/QR codes and generate internal codes when required.

- Item master with store locations, medical store type, potency, distribution mechanism, packaging unit, accounting quantity, dosage method, price, expiry and batch details.
- Receipt and issue workflows with scanner integration and audit trail.
- Low stock monitoring hospital-wise, department-wise and item-wise, with configurable thresholds and alerts.
- Admin dashboard and management sub-module with admin-defined lookup values.
- Comprehensive graphs for current stock, demand forecast, department-wise issue, consumption ranking and approximate budgets.
- Generic search and report builder with downloadable outputs and configurable graph x-axis.

## 4. Module 2: Cathology Lab Store Management

Module 2 will function as a separate module within the same suite. It will cover Cath Lab store receipt, sub-store handling, procedure-room issue, live patient-wise consumption, returns/re-ingestion and expenditure calculation.

- Patient registration by patient type, procedure, doctor and relevant case details.
- Patient wristband barcode generation at registration for procedure-time identification.
- Store receipt by source with barcode/QR scanning and location-wise placement/issue.
- Issue of medical items from sub-stores to procedure rooms against the nursing individual receiving stores.
- Live recording of items used in procedure room on a patient, including patient-wise accounting and costing.
- Return and re-ingestion of unused/reused items with nursing account adjustment and sub-store stock update.
- Minimum daily issue suggestions for procedure rooms based on previous consumption history.
- Administrative dashboard showing item-wise, doctor-wise, procedure-wise and patient-category views.

## 5. Master Administration and Security

- Master admin page for creating and managing module administrators.
- Role-based access for each module with ability to assign multiple roles to a single user.
- Module-specific dashboards for store users, nursing users, doctors/consultants where applicable, administrators and executive users.
- Complete transaction audit logs for receipt, issue, transfer, adjustment, return, stock taking, report generation and administration changes.
- Admin-managed lookup values for store locations, item types, departments, procedures, patient categories, doctors, units and thresholds.

## 6. Deployment and Development Compliance

| GSR Constraint | Proposed Compliance |
| --- | --- |
| The software shall be deployed on premises in isolated LAN environment. | The application will run completely on AFIC on-premises virtual infrastructure within isolated LAN, without internet dependency. |
| No part of the software shall be internet based or shall take its feed in any form from internet systems. | The application will run completely on AFIC on-premises virtual infrastructure within isolated LAN, without internet dependency. |
| The software shall be developed in a programming language currently common within the software development domain and whose development resources are easily available in the market. | Fully complied. The implementation uses common JavaScript technologies: React, Node.js, Express, and MongoDB/Mongoose. |
| The software will be web based and deployed on virtual platforms to be provided by AFIC. | Fully complied through web-based deployment on AFIC-provided virtual platforms. |
| The software shall be responsive and usable through PCs, laptops, Android devices and tablets. | Fully complied through responsive React UI and browser-based access. |
| The software shall be designed with user friendliness and smooth functioning as prime requirements. | Fully complied through role-specific dashboards, scan-based workflows, and structured reporting. |

## 7. Delivery Methodology and Acceptance

After award of contract, the project will follow the GSR delivery process:

1. Finalize prototype after incorporating user changes.
2. Lock scope of work through binding documentation after final prototype approval.
3. Develop beta version.
4. Deploy beta version in test environment.
5. Finalize beta after removing anomalies communicated by client.
6. Develop production-ready version.
7. Deploy in production.
8. Conduct training and hand-holding for master trainers and nominated users.

Warranty/support: One year service-level support is included within the project cost. Installation, commissioning and master-trainer training are included on turnkey basis with no separate cost.

## 8. Additional Unique Selling Features

- Expiry and near-expiry alerts with FEFO/FIFO issue guidance.
- Audit-ready transaction history for each item, batch, patient, procedure, nurse and department.
- Configurable approval workflow for high-value or critical items.
- Dashboard snapshots for executive review without requiring report design skills.
- Data import templates for migration of existing item master and opening stock.

## Anx-A: List of Supporting Documents

| Ser | Supporting Document | Included in Submission |
| --- | --- | --- |
| 1 | Software offered along with price as per format given at Anx-B | Included in separate Financial Document |
| 2 | Compliance sheet as per Anx-C | Included in this Technical Solution Document |

## Anx-C: Compliance Summary

| Area | Compliance |
| --- | --- |
| Number of modules | Fully compliant. Two integrated modules will be supplied. |
| Module 1 registration, receipt and issue | Fully compliant through main medical store inventory workflows. |
| Existing company barcode/QR registration | Fully compliant through barcode/QR fields and scan search. |
| Internal barcode generation | Fully compliant through generated item/patient identifiers. |
| Metadata population on scan | Fully compliant through barcode lookup APIs. |
| Store location, item type, potency, distribution, packaging, quantity, dosage, price and expiry | Fully compliant through extended master item and batch metadata. |
| Department-wise issue | Fully compliant through issue transactions with department fields. |
| Low stock tracking and notifications | Fully compliant through dashboard and alert endpoints. |
| Admin dashboards and lookup management | Fully compliant through GSR lookup APIs and dashboards. |
| User role-based access and multi-role assignment | Fully compliant through pharmacy user role extensions. |
| Downloadable graphs/reports and generic search | Fully compliant through generic report endpoints and frontend export-ready data tables. |
| Module 2 Cath Lab admin, patient registration, wristband barcode and patient-wise consumption | Fully compliant through Cath Lab case and transaction workflows. |
| Cath Lab receipt, sub-store issue, procedure-room consumption and returns | Fully compliant through scan-based stock transaction endpoints. |
| Cost calculations overall, procedure-wise and patient-wise | Fully compliant through Cath Lab dashboard aggregation. |
| Minimum daily issue suggestions | Fully compliant through previous-consumption based suggestion endpoint. |
| On-premises isolated LAN deployment | Fully compliant. No internet dependency is required for runtime. |


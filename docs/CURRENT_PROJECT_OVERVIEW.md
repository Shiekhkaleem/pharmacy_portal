# Current Project Overview

## Repository Shape

The project is a JavaScript full-stack healthcare application.

| Area | Path | Current Role |
| --- | --- | --- |
| Client | `client/` | React 19 + Vite frontend with Tailwind CSS and role-based dashboards |
| Server | `server/` | Node.js + Express API with Mongoose models |
| Docs | `docs/` | Proposal, financial PDF and implementation documentation |
| Scripts | `server/scripts/` | Migration, seed, debug and verification scripts |

## Runtime Stack

- Frontend: React, React Router, Vite, Tailwind CSS, lucide-react, Chart.js dependencies.
- Backend: Node.js, Express, Mongoose, JWT auth, Socket.IO.
- Database: MongoDB via Mongoose models.
- Barcode/QR libraries already present: `qrcode` server-side, `qrcode.react`, `react-barcode`, and `html5-qrcode` client-side.

## Existing Functional Areas

| Module | Current Capability |
| --- | --- |
| Authentication | Login, protected routes, JWT middleware |
| Super Admin | Module registry, feature toggles, layout builder |
| Hospital Admin | Doctors, pharmacies, pharmacists and patients |
| Doctor | Appointments, patients, prescriptions |
| Staff | Patient registration, check-in, digital health cards, health ID scanner |
| Patient | Dashboard, doctor discovery, appointments, prescriptions, lab reports, billing |
| Pharmacy | Dashboard, prescription queue, medicine inventory, stock alerts, POS/billing |

## Existing Pharmacy Backend

The current pharmacy backend already contains several GSR-relevant foundations:

- `MasterMedicine`: centralized medicine/item registry.
- `MasterMedicineBatch`: pharmacy-specific batches, barcode/QR fields, quantity, expiry, reorder level, storage location, pricing and status.
- `PharmacyUser`: pharmacy-specific role association.
- `PharmacyAuditLog`: immutable hash-chained audit trail.
- `pharmacyDashboardController`: KPIs, alerts and sales analytics.
- `masterMedicineBatchController`: inventory stats, barcode search, batch CRUD, low-stock and expiry alerts.
- `medicineController`: compatibility wrapper for older medicine pages.

## Existing Frontend Pharmacy Screens

- `client/src/pages/pharmacy/PharmacyDashboard.jsx`
- `client/src/pages/pharmacy/MedicineInventory.jsx`
- `client/src/pages/pharmacy/StockAlerts.jsx`
- `client/src/pages/pharmacy/POSInterface.jsx`
- `client/src/pages/pharmacy/PrescriptionQueue.jsx`

## Key Gaps Before GSR Work

- Pharmacy users supported only one module role.
- Audit log enum did not include all stock and Cath Lab transaction actions.
- No dedicated GSR lookup management API.
- No main-store receipt/department issue transaction model separate from POS or prescription dispensing.
- No Cath Lab store module for patient wristbands, procedure-room issue, patient-wise consumption and returns.
- No single GSR suite screen tying Module 1 and Module 2 together.
- Some existing inventory audit entries referenced entity/action names not accepted by the audit schema.

## Implementation Direction

The GSR work should extend the existing pharmacy inventory foundation rather than create a separate disconnected application. Master medicines and batches remain the item/batch source of truth, while new GSR transaction models capture main-store and Cath Lab workflows against that existing stock.


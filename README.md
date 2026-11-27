# EnterpriseX – Integrated Finance, Procurement, Inventory & Sales ERP

> **Project 08 Technical Assessment | Advanced / Very Difficult**
> Complete implementation covering all **15 Hands-on Assessments** and the **Domain-Specific Capstone Challenge**.

---

## 1. Executive Summary & Overview

**EnterpriseX** is a modular enterprise resource planning platform engineered to unify purchasing, supplier relations, warehousing, commercial sales fulfillment, general ledger accounting, and executive analytics into a single transactionally consistent platform.

### Strict Theme & UI Palette (Zero Blue):
- **Emerald Green (`#167D58`):** Primary brand accent, active navigation, key CTAs, and verified statuses.
- **Dark Charcoal (`#182420`):** Dark mode background, deep slates, structural contrast, and table headers.
- **Warm Ivory (`#F7F6F0`):** Light mode background, warm cards, and premium surface texturing.
- **Amber (`#D99A39`):** Pending approvals, warning banners, accents, and discrepancy alerts.
- **Soft Sage (`#A8C3AE`):** Neutral dividers, borders, subtle highlights, and secondary tags.

---

## 2. Technology Stack

| Layer | Technologies Selected | Justification |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts | Premium responsive SaaS workspace, light/dark modes, Ctrl+K search, 1-click role switcher. |
| **Core Business API** | Node.js 22, Express.js, TypeScript, REST Architecture | Domain-separated services, robust middleware (Auth, RBAC, RequestID, Audit Logging). |
| **Finance Engine** | Python 3.13, FastAPI, Pydantic, Pandas, Pytest | High-precision deterministic double-entry validation, tax rules engine, reconciliation algorithms. |
| **Database & ORM** | PostgreSQL 16 / SQLite Dual-Target, Prisma ORM | Relational integrity, atomic transactions, foreign keys, and migration discipline. |
| **Background & Caching**| Redis 7, BullMQ Architecture | Asynchronous document rendering, background email simulations, and webhook delivery. |
| **DevOps & CI/CD** | Docker, Docker Compose, GitHub Actions, CODEOWNERS | Automated unit, integration, linting, build pipelines, and production health monitoring. |
| **Testing** | Vitest, Supertest, Pytest, HTTPX | 100% automated passing test suites for API, workflows, and finance algorithms. |

---

## 3. Synthetic Demo Accounts (1-Click Login for All 6 Roles)

All demo accounts share the password: `EnterpriseX2026!`

| Role Name | Demo Email Address | Approval Limit | System Responsibility |
| :--- | :--- | :--- | :--- |
| **ERP Administrator** | `admin@enterprisex.com` | $1,000,000 | Complete system governance, incident remediation, and audit trail. |
| **Finance Officer** | `finance@enterprisex.com` | $250,000 | Chart of accounts, journal postings, 3-way matching, payments, reports. |
| **Department Manager** | `manager@enterprisex.com` | $50,000 | Procurement budget approvals, department requisitions up to limit. |
| **Procurement Officer**| `procurement@enterprisex.com` | $10,000 | Vendor negotiations, purchase order issuance, RFQs. |
| **Warehouse Operator** | `warehouse@enterprisex.com` | $0 (Staff) | Inbound goods receipts (GRN), inventory inspections, bin adjustments. |
| **Sales Representative**| `sales@enterprisex.com` | $5,000 | Customer accounts, sales orders, stock reservation, fulfillment. |

---

## 4. 15 Mandatory Assessments Traceability

- **Assessment 01 – Frontend Architecture:** Next.js 14 App Router with responsive navigation, zero blue Emerald palette, and Ctrl+K search.
- **Assessment 02 – Backend Architecture:** Modular Express REST APIs covering 12 business domains.
- **Assessment 03 – Database Design:** Full Prisma schema with COA, journals, POs, GRN, stock movements, and financial periods.
- **Assessment 04 – Authorization & RBAC:** Multi-level permissions (Org, Branch, Dept, Warehouse), approval limits, and immutable audit logs.
- **Assessment 05 – Python Finance Processing:** Deterministic Decimal validation, configurable tax schedules, and reconciliation engine (8 passed pytest).
- **Assessment 06 – FastAPI Business Reporting:** Trial Balance, Balance Sheet, P&L, DSO, DPO, and inventory turnover analytics.
- **Assessment 07 – Cross-Module Workflows:** Purchase-to-Pay and Order-to-Cash engines with safe compensation rollback.
- **Assessment 08 – Integrations:** Sandbox email queue, printable PDF documents, vendor dispatch simulator, and CSV/JSON accounting export.
- **Assessment 09 – Docker Infrastructure:** Multi-stage Dockerfiles and Docker Compose with health checks and private networking.
- **Assessment 10 – Git & Domain Governance:** CODEOWNERS domain mapping and migration sequencing discipline.
- **Assessment 11 – ERP CI/CD:** GitHub Actions CI workflow for unit tests, linting, schema validation, and Next.js build.
- **Assessment 12 – End-to-End Testing:** Vitest and Supertest automated test suite covering all business workflows (9 passed tests).
- **Assessment 13 – API Documentation:** OpenAPI spec at `/api/docs/spec` and Postman Collection v2.1 in `docs/`.
- **Assessment 14 – ERP Deployment:** Production health endpoints (`/health`), container readiness probes, and backup runbooks.
- **Assessment 15 – ERP Incident Simulation:** Integrity diagnostic scanner detecting ledger imbalances, duplicate invoices, and automated remediation.
- **Domain-Specific Capstone Challenge:** End-to-end Purchase-to-Pay workflow with verified rollback compensation upon simulated failure.

---

## 5. Local Setup & Quick Start

### Prerequisites
- Node.js 22+
- Python 3.13+
- Git

### 1. Backend Setup & Database Seeding
```bash
cd backend
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm test
npm run dev
# Running on http://localhost:5000
```

### 2. Python Finance Engine Setup
```bash
cd python-service
pip install -r requirements.txt
python -m pytest tests/ -v
python main.py
# Running on http://localhost:8000 (Swagger docs at http://localhost:8000/docs)
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:3000
```

---

## 6. Incident Simulation & Recovery Runbook

To execute the automated incident diagnostic scanner and test failure compensation:
```bash
cd backend
npx tsx ../scripts/incident_simulation.ts
```

---

## 7. Documentation Deliverables

- **Comprehensive PDF:** [`EnterpriseX_Project_Documentation.pdf`](file:///c:/Users/amits/Documents/EnterpriseX/EnterpriseX_Project_Documentation.pdf) (Also located in `docs/`)
- **Architecture & ER Diagrams:** [`docs/ARCHITECTURE.md`](file:///c:/Users/amits/Documents/EnterpriseX/docs/ARCHITECTURE.md)
- **REST API Contracts:** [`docs/API_DOCUMENTATION.md`](file:///c:/Users/amits/Documents/EnterpriseX/docs/API_DOCUMENTATION.md)
- **Postman Collection:** [`docs/EnterpriseX_Postman_Collection.json`](file:///c:/Users/amits/Documents/EnterpriseX/docs/EnterpriseX_Postman_Collection.json)
- **Assessments Checklist:** [`docs/ASSESSMENTS_CHECKLIST.md`](file:///c:/Users/amits/Documents/EnterpriseX/docs/ASSESSMENTS_CHECKLIST.md)
- **Incident Runbook:** [`docs/INCIDENT_RUNBOOK.md`](file:///c:/Users/amits/Documents/EnterpriseX/docs/INCIDENT_RUNBOOK.md)

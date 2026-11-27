# EnterpriseX REST API Documentation

Base URLs:
- Core Business API: `http://localhost:5000/api`
- Python Finance Service: `http://localhost:8000/api`
- Swagger OpenAPI Spec: `http://localhost:5000/api/docs/spec`

---

## 1. Authentication & RBAC

### `POST /api/auth/login`
Authenticates user and returns JWT access token + refresh token.
- **Request Body:**
  ```json
  { "email": "admin@enterprisex.com", "password": "EnterpriseX2026!" }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "fullName": "Alexandra Vance", "role": "ERP_ADMINISTRATOR", "approvalLimit": 1000000 },
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "eyJhbGciOiJIUzI1Ni..."
    }
  }
  ```

### `GET /api/auth/demo-accounts`
Returns all 6 synthetic demo accounts with roles and descriptions.

---

## 2. Procurement & Purchasing

### `GET /api/procurement/purchase-orders`
List purchase orders with status and vendor filters.

### `POST /api/procurement/purchase-orders`
Creates a new purchase order requisition in `PENDING_APPROVAL` status.

### `PATCH /api/procurement/purchase-orders/:id/approve`
Approves PO. Enforces department manager approval limits ($50,000 threshold).

---

## 3. Warehousing & Goods Receipts

### `POST /api/logistics/goods-receipts`
Receives physical shipment against approved PO, updates inventory stock levels, and records `StockMovement`.

---

## 4. Invoicing & Treasury Payments

### `POST /api/billing/invoices/ap`
Creates Accounts Payable Invoice with 3-Way Matching validation.

### `POST /api/billing/payments`
Records payment with `idempotencyKey` and automatically posts balancing GL Journal Entry (Debit AP 2010, Credit Cash 1010).

---

## 5. Financial Management & Reporting

### `POST /api/finance/journals`
Posts balanced journal entry. Enforces `total_debits == total_credits` and checks that the period is `OPEN`.

### `GET /api/reports/trial-balance`
Generates authoritative Trial Balance statement.

### `GET /api/reports/executive-analytics`
High-efficiency KPI analytics (Revenue, Net Profit, DSO, DPO, Turnover).

---

## 6. System Incidents & Diagnostics

### `GET /api/system/diagnostics`
Integrity scanner detecting ledger imbalances and duplicate invoices.

### `POST /api/system/incidents/simulate`
Simulates high-severity incidents for automated runbook testing.

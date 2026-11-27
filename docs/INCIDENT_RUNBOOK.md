# EnterpriseX ERP Incident Simulation & Recovery Runbook

This document details procedures for diagnosing and remediating production incidents evaluated in **Assessment 15**.

---

## Incident 1: General Ledger Double-Entry Imbalance

### Symptoms:
- Trial Balance report shows `is_balanced: false`.
- Diagnostic scanner flags `JOURNAL_IMBALANCE`.

### Root Cause:
- Network disconnect or power interruption during legacy batch journal insertion, creating unbalanced debit/credit lines.

### Remediation Procedure:
1. Navigate to **Admin & Incidents** (`/admin`).
2. Run **Refresh Diagnostics** to invoke `/api/system/diagnostics`.
3. Locate the corrupted journal entry ID.
4. Execute automated reconciliation script or click **Auto-Remediate** to synchronize balances.

---

## Incident 2: Attempted Duplicate Vendor Invoice Posting

### Symptoms:
- Supplier system initiates automated retry without backoff.
- HTTP `409 DUPLICATE_INVOICE` returned to caller.

### Remediation Procedure:
- EnterpriseX checks existing active AP invoices for the purchase order reference.
- Duplicate payload is intercepted before database commit.
- External supplier receives original invoice confirmation without duplicate accounts payable liability.

---

## Incident 3: Attempted Negative Warehouse Stock Fulfillment

### Symptoms:
- Sales order fulfillment request exceeds available on-hand stock.
- HTTP `400 NEGATIVE_STOCK` returned to warehouse operator.

### Remediation Procedure:
- Inventory service checks `quantityOnHand >= requestedQty` before decrementing.
- Cycle recount is initiated via **Physical Stock Adjustment** modal (`/inventory`).
- Purchase requisition is triggered to replenish buffer.

---

## Incident 4: Partial Workflow Failure & Compensation Rollback

### Symptoms:
- Wire transfer settlement times out during P2P execution.

### Automated Compensation Procedure:
1. Workflow engine detects downstream failure.
2. If payment was authorized, marks payment `REFUNDED`.
3. If AP invoice was issued, sets invoice status to `VOIDED`.
4. If goods were received into warehouse, decrements `StockLevel` and sets GRN status to `REJECTED`.
5. Purchase Order status is set to `CANCELLED`.
6. Audit log records `INCIDENT_RESOLVE` with full compensation trail.

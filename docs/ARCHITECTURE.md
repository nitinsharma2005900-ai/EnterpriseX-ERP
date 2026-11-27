# EnterpriseX Technical Architecture & Data Models

## 1. High-Level Architectural Topology

```mermaid
graph TD
    Client["Next.js 14 Workspace (Port 3000)<br/>Tailwind CSS / Lucide / Recharts"]
    API["Primary Business API (Port 5000)<br/>Express.js / TypeScript / RBAC"]
    DB[("PostgreSQL 16 / SQLite<br/>Prisma ORM System of Record")]
    Python["Finance & Reporting Engine (Port 8000)<br/>FastAPI / Python 3.13 / Pydantic"]
    Queue[("Redis 7 & Job Queue")]

    Client -->|REST & JWT| API
    API -->|Prisma Client| DB
    API -->|HTTP RPC / Async| Python
    API -->|Task Enqueue| Queue
    Python -->|Deterministic Compute| API
```

## 2. Relational Entity-Relationship Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ BRANCH : contains
    ORGANIZATION ||--o{ DEPARTMENT : contains
    BRANCH ||--o{ WAREHOUSE : operates
    ORGANIZATION ||--o{ USER : employs
    
    USER ||--o{ PURCHASE_ORDER : requests
    USER ||--o{ PURCHASE_ORDER : approves
    USER ||--o{ GOODS_RECEIPT : receives
    USER ||--o{ AUDIT_LOG : generates
    
    VENDOR ||--o{ PURCHASE_ORDER : supplies
    DEPARTMENT ||--o{ PURCHASE_ORDER : budgets
    PURCHASE_ORDER ||--o{ PURCHASE_ORDER_ITEM : includes
    PRODUCT ||--o{ PURCHASE_ORDER_ITEM : referenced_in
    
    PURCHASE_ORDER ||--o{ GOODS_RECEIPT : fulfills
    GOODS_RECEIPT ||--o{ GOODS_RECEIPT_ITEM : logs
    PRODUCT ||--o{ GOODS_RECEIPT_ITEM : received_as
    
    PRODUCT ||--o{ STOCK_LEVEL : tracked_in
    WAREHOUSE ||--o{ STOCK_LEVEL : stores
    PRODUCT ||--o{ STOCK_MOVEMENT : moves
    WAREHOUSE ||--o{ STOCK_MOVEMENT : at_location
    
    CUSTOMER ||--o{ SALES_ORDER : places
    SALES_ORDER ||--o{ SALES_ORDER_ITEM : includes
    PRODUCT ||--o{ SALES_ORDER_ITEM : sold_in
    
    PURCHASE_ORDER ||--o{ INVOICE : generates_ap
    SALES_ORDER ||--o{ INVOICE : generates_ar
    GOODS_RECEIPT ||--o{ INVOICE : matched_with
    INVOICE ||--o{ INVOICE_ITEM : items
    INVOICE ||--o{ PAYMENT : settled_by
    
    FINANCIAL_PERIOD ||--o{ JOURNAL_ENTRY : contains
    JOURNAL_ENTRY ||--o{ JOURNAL_LINE : entries
    ACCOUNT ||--o{ JOURNAL_LINE : debited_credited
```

## 3. Data Integrity & Domain Invariants

1. **Double-Entry General Ledger Balance:** Every journal entry requires `sum(debit) == sum(credit) > 0`.
2. **Financial Period Controls:** Closed or locked financial periods reject any journal entry attempt.
3. **Non-Negative Stock:** Physical inventory increments on GRN and decrements on SO fulfillment. Negative levels throw `NEGATIVE_STOCK`.
4. **Idempotency Guardrail:** Payment processing requires an `idempotencyKey` preventing duplicate charges.
5. **3-Way Matching:** Accounts payable invoices verify PO amounts against received GRN quantities.

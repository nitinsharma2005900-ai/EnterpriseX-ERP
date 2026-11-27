# API contracts

Base URL: `https://enterprisex-api-nitinsharma.onrender.com/api`; the frontend exposes the same paths at `https://enterprisex-erp.vercel.app/api`.

`GET /api/docs/spec` generates OpenAPI 3.1 from mounted routes and their Zod schemas. `docs/openapi.json` is a captured specification. `docs/EnterpriseX_Postman_Collection.json` contains requests, bearer-token configuration and login token capture.

Authentication: `POST /auth/login` with email/password returns user, accessToken and refreshToken. `POST /auth/refresh` rotates the refresh token. `POST /auth/logout` revokes sessions. Use `Authorization: Bearer <accessToken>` for protected calls. FastAPI calls use a separate `X-Service-Token` and are made by Express.

Responses use `{ success: true, data: ... }`; errors use `{ success: false, error: { code, message, details, requestId } }`. PDF and CSV downloads return the actual file bytes with attachment headers. List endpoints accept `page` and `pageSize` (1–500); supported domain filters include status, vendorId, customerId, periodId, warehouseId, action and entityType. Responses include page/pageSize/hasMore. `/api/v1/*` is a compatible versioned alias.

Core routes:

| Domain | Routes and behavior |
| --- | --- |
| Finance | GET/POST accounts, PATCH/DELETE accounts/:id, GET/POST periods, PATCH periods/:id/close, GET/POST journals, GET general-ledger |
| Procurement | GET/POST purchase-orders, GET :id, PATCH :id/approve or :id/reject |
| Receiving | GET/POST goods-receipts, GET :id |
| Inventory | GET/POST products, GET/PATCH/DELETE products/:id, warehouses, stock-levels, stock-movements, POST adjust |
| Sales | GET/POST sales-orders, GET :id, POST :id/reserve and :id/fulfill |
| Billing | GET invoices and invoices/:id, POST invoices/ap, invoices/ar and payments |
| Master data | GET/POST vendors/customers; GET, PATCH and DELETE by ID; legacy validated vendor PUT remains compatible |
| Workflows | POST purchase-to-pay and order-to-cash, actor-bound idempotencyKey required |
| Files | GET documents/po/:id/pdf, documents/grn/:id/pdf, documents/invoice/:id/pdf |
| Integrations | Accounting export?format=csv or json, accounting import, email/send, email/queue, jobs/:id/retry, explicit vendor-simulator/dispatch |
| Operation | Health/readiness, diagnostics, incidents, incidents/simulate, incidents/:id/resolve, audit, notifications |

PO states: PENDING_APPROVAL -> APPROVED -> PARTIALLY_RECEIVED -> COMPLETED. Rejection is allowed only while pending. SO states: CONFIRMED -> RESERVED -> FULFILLED -> INVOICED. Invoice states: ISSUED -> PARTIALLY_PAID -> PAID. Financial periods close irreversibly through the normal API; a closed or out-of-date period rejects posting.

HTTP 400 is invalid input/business state, 401 missing/expired/revoked session, 403 role/scope/approval denial, 404 absent or out-of-scope resource, 409 duplicate/conflicting replay/record in use, and 503 required processing dependency unavailable. There is no automatic retry of an arbitrary financial POST. Workflow/payment idempotency and serializable transaction retry provide controlled retry behavior.

Invoice creation validates ordered products, prices, tax and accepted quantities. Payment keys bind invoice/amount/method. A workflow key binds workflow/payload/actor. Reusing a key for different values is a conflict. A failed complete workflow stores an explanation after rolling back business mutations; it does not retain partially posted stock or journals.

The accounting importer accepts validated `accounts` and balanced `journals`. Account balances cannot be imported as arbitrary numbers. Existing account categories cannot be silently changed. The authenticated caller supplies the audit/journal actor through the server, not a client-controlled identity.

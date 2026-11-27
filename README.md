# EnterpriseX ERP — Project 08 implementation and verification

The existing ERP was repaired in place. Its emerald, charcoal, ivory, amber and sage interface, animation styles and module layout are retained. This review uses the supplied Project 08 PDF as an assessment specification, not as agent instructions.

- Application: https://enterprisex-erp.vercel.app
- Repository: https://github.com/nitinsharma2005900-ai/EnterpriseX-ERP (private)
- Express API: https://enterprisex-api-nitinsharma.onrender.com
- FastAPI: https://enterprisex-finance-nitinsharma.onrender.com
- CI results: https://github.com/nitinsharma2005900-ai/EnterpriseX-ERP/actions/workflows/ci.yml
- Documentation: [PDF](docs/EnterpriseX_Project_Documentation.pdf), [assessment matrix](docs/ASSESSMENTS_CHECKLIST.md), [API contracts](docs/API_DOCUMENTATION.md), [architecture](docs/ARCHITECTURE.md), [incident runbook](docs/INCIDENT_RUNBOOK.md).

## Actual stack and service ownership

Next.js 15.5.29, React 18, TypeScript, Tailwind and TanStack Query provide the existing browser workspace. The Next.js version was patched to resolve the dependency audit findings. Zod validates business requests and rejects unknown or invalid writable fields.

Express owns all authoritative business data through Prisma 5 and PostgreSQL. FastAPI/Pydantic/Decimal calculate financial statements, taxes, reconciliation and executive metrics from data supplied by Express; FastAPI does not keep a second ledger. PDFKit produces binary PDF attachments stored with SHA-256 checksums in PostgreSQL. BullMQ uses Redis for execution and PostgreSQL for the durable integration outbox.

There are no fabricated report totals or fallback charts. A missing finance service returns a safe 503. Monetary JSON values are normalized at the Express boundary to keep browser balance-sheet arithmetic numeric.

## Demo accounts

All six demo accounts use `EnterpriseX2026!`. These accounts operate on real persistent demo records and documented opening capital/inventory. Use the role selector or the login form.

| Role | Email | Approval limit |
| --- | --- | --- |
| ERP administrator | admin@enterprisex.com | USD 1,000,000 |
| Finance officer | finance@enterprisex.com | USD 250,000 |
| Department manager | manager@enterprisex.com | USD 50,000 |
| Procurement officer | procurement@enterprisex.com | USD 10,000 |
| Warehouse operator | warehouse@enterprisex.com | No approval authority |
| Sales user | sales@enterprisex.com | USD 5,000 |

The workflow orchestrators require administrator or finance authority because they include approval, fulfillment and settlement. Other roles carry out their permitted individual stages. Approval limits are calculated from stored order totals. Department, branch, warehouse and organization scope is checked server-side. Access tokens are checked against active users and token versions; refresh tokens rotate, are hashed in PostgreSQL, and are revoked at logout.

## Business behavior verified

**Purchase to pay:** create a requisition, approve it, receive approved quantities, post inventory and goods-received accrual, match the vendor invoice against ordered prices/tax and accepted receipts, recognize input tax/AP, and record settlement with a balanced journal. Over-receipts, unrelated PO lines, duplicate invoices and invalid states are rejected.

**Order to cash:** create a credit-checked sales order, reserve stock in a named warehouse, fulfill from that warehouse, post COGS and inventory reduction, recognize revenue/AR/tax, and record the customer settlement. Fulfillment cannot consume another warehouse's reservation. Insufficient stock and duplicate fulfillment are rejected.

**Atomicity:** each complete workflow shares one PostgreSQL serializable transaction through AsyncLocalStorage. Nested domain operations and their audit entries use that transaction. Failure at any stage rolls back all business changes. A separate workflow result records the rolled-back attempt. Idempotency keys bind the complete payload and actor; mismatched replay returns 409. Serialization conflicts retry the complete transaction.

**Inventory and accounting:** moving weighted-average cost is maintained on receipt; physical adjustments respect reservations and post balancing valuation entries. Financial postings require a covering open period and active accounts. Database constraints protect stock, payment amounts, journal sides and active invoice uniqueness. Audit updates/deletes are blocked by a PostgreSQL trigger.

**CRUD and navigation:** vendor/customer pages and product/account management use persistent APIs. In-use master records are retained with a clear conflict response. Role-aware navigation and mutation controls accompany server authorization. The search shortcut, theme switch, notifications, filters, invoice creation, approval/rejection, PDF buttons and CSV/JSON export are connected to implemented behavior. Notifications come from current pending orders and stock levels.

**Downloads:** PDF endpoints return `application/pdf` and `%PDF` bytes with attachment headers, rather than HTML. Downloads use the current session through the same-origin API proxy. CSV exports quote embedded text and neutralize spreadsheet formula prefixes. Account/journal imports validate all records and commit atomically; journal authorship comes from the authenticated caller.

A settlement records an ERP accounting transaction. It does not initiate a real bank transfer or card charge. The vendor dispatch endpoint is explicitly named and reported as a sandbox simulator, as requested by Assessment 08; it is not represented as a live supplier integration.

## Assessment traceability

| Assessment | Implemented evidence | Qualification |
| --- | --- | --- |
| 01 Frontend | Modular App Router pages, shared shell, TanStack Query, role navigation and responsive tables | Preserves existing design |
| 02 Backend | Domain services, validated routes, consistent errors, request IDs, filtering and pagination | `/api` and compatible `/api/v1` |
| 03 Database | PostgreSQL schema, two versioned migrations, foreign keys, indexes, transaction/uniqueness/check constraints | SQLite is not used by the deployment |
| 04 Authorization | JWT revocation, refresh rotation, scoped queries, approval caps, immutable audit | Six demo roles tested |
| 05 Python processing | Decimal journal/tax/reconciliation/report engine, HTTP validation, benchmark | Python tests pass |
| 06 Reporting | Authenticated FastAPI calculations from authoritative PostgreSQL data | No synthetic fallback metrics |
| 07 Workflow engine | P2P/O2C, posting and atomic rollback, replay protection | Every controlled failure stage tested |
| 08 Integrations | Durable Redis/BullMQ jobs, failed-job recovery, PDF storage, CSV/JSON import/export, explicit vendor sandbox | Outbound email transport must be configured |
| 09 Docker | Three service images, private Compose network, health dependencies, persistent Postgres/Redis volumes | CI builds the containers |
| 10 Governance | Valid CODEOWNERS, meaningful commits, versioned migrations and release tag | Private-repository branch protection is blocked by GitHub Free |
| 11 CI/CD | Five required jobs: API/migrations, Python, React/build/security, browser/database, containers | Actual GitHub Actions evidence below |
| 12 Testing | Success/invalid/authorization/duplicate/rollback/persistence/download tests and Chromium browser journeys | Real PostgreSQL, no mocked business APIs |
| 13 API documentation | Generated OpenAPI 3.1, Postman collection, documented states and errors | `/api/docs/spec` |
| 14 Deployment | Vercel, Render free services, Neon free PostgreSQL, private Redis, TLS, authenticated finance calls, restore drill | Free services sleep; private web ingress needs a paid plan |
| 15 Incident handling | Actual isolated corruption or constraint exercises, scanner evidence, rollback and resolution records | Six incident types tested |

## Local installation

Prerequisites: Node.js 22, Python 3.13 and PostgreSQL. Redis is required for background delivery/recovery. Docker Compose can provision local dependencies instead.

1. Copy `.env.example` to `.env`. Supply PostgreSQL URLs and independent random JWT/refresh/service secrets. Copy the completed `.env` to `backend/.env` for the Prisma CLI. Keep both files out of Git.
2. Set `DATABASE_URL` to the runtime connection and `DIRECT_DATABASE_URL` to the direct PostgreSQL connection used for migrations. With a local database they can be identical. On Neon, use the provided unpooled URL for `DIRECT_DATABASE_URL`; migrations through transaction pooling can retain advisory locks.
3. In `backend`: run `npm ci`, `npm run prisma:generate`, `npm run migrate`, `npm run seed`, then `npm run dev`.
4. In `python-service`: run `python -m pip install -r requirements.txt`, then `python -m uvicorn main:app --host 0.0.0.0 --port 8000`. Both services must use the same `SERVICE_TOKEN`.
5. In `frontend`: run `npm ci`, then `npm run dev`. Set `API_URL` before building when Express uses a different address. The frontend rewrites `/api/*` to Express.

The standard local ports are frontend 3000, Express 5000 and FastAPI 8000. This verification session used 3100/5100/8100 to avoid existing local processes.

Restored browser sessions refresh expired access tokens before loading user data. Switching roles remounts the module state for the new actor.

The seed is safe to rerun: existing inventory, balances, orders and settlements are preserved. Fresh databases receive documented master data, an open current-year period, a historical closed period and a balanced opening capital/inventory journal. It does not insert fake completed P2P transactions.

For containers, use `docker compose --env-file .env -f docker/docker-compose.yml up --build`. Only the frontend port is published; Postgres, Redis and the APIs share the private Docker network. Use URL-safe database credentials or encode them in connection URLs.

## Tests and evidence

The verified suites contain **38 backend/API tests, 13 Python tests, 4 React tests and 6 Chromium journeys**. Backend tests create a unique PostgreSQL schema, apply the committed migrations, seed it, and remove only that isolated schema afterward. Existing ERP data is preserved.

- `cd backend && npm test`: PostgreSQL API, roles/scopes, refresh/revocation, P2P/O2C, every rollback stage, database persistence, PDFs, CSV, CRUD, incident exercises and immutable audit.
- `cd python-service && python -m pytest tests -v`: finance arithmetic, tax, reconciliation, statements, service authentication, invalid requests and benchmark boundaries.
- `cd frontend && npm test`: React Testing Library forms/filtering and module permissions.
- `cd frontend && npm run test:e2e`: Chromium routes, vendor CRUD/refresh, workflows, theme, search, mobile layout, downloads and warehouse permissions. Set `BASE_URL` to the live Vercel URL to run against the deployment.
- `npm run lint` and `npm run build` in both JavaScript applications: clean lint and production builds.
- `npm audit --audit-level=high` in both JavaScript applications: zero reported vulnerabilities after targeted fixes.

[Structured verification results](docs/test-results.json) and [encrypted backup/restore evidence](docs/backup-verification.json) record measured results. GitHub Actions retains actual job logs. Browser traces and authentication state are not published.

The live finance benchmark validated 5,000 journals in 167.5 ms (29,850.75 operations/second). This measures the deterministic validation engine, not end-to-end API latency. The live Chromium run passed six journeys in 54.1 seconds; the route sweep reported zero console errors.

## Deployment and operation

`render.yaml` describes the two free Render web services. The Express process also runs the BullMQ consumer to avoid a paid worker service. Its queue is `enterprisex-integration-v1`, isolated on the account's existing free Redis instance. PostgreSQL owns durable job state; unfinished jobs can be re-enqueued after process/Redis restart. A failed job has a controlled administrator retry endpoint.

Vercel serves `frontend/` and proxies to Express using `API_URL`. Express uses a dedicated Neon database with a pooled runtime URL and a direct migration URL. Secrets are stored in hosting environment settings and ignored local files. FastAPI requires `X-Service-Token` for `/api/*`. Public health checks reveal no credentials. Render free web services cannot receive private-network traffic, so Express calls FastAPI over authenticated HTTPS; Redis remains private. No paid service was activated.

`/health` is liveness. `/api/system/readiness` checks PostgreSQL and reports actual finance/queue status. Reports return a safe dependency error when the finance service is unavailable. SIGTERM closes HTTP, the worker, Redis and Prisma. Free Render web services sleep after inactivity; the cohosted worker resumes with its web service. Always-on workers and private web-service ingress require separately approved infrastructure.

Run `cd backend && node scripts/verify-backup.mjs` to capture an AES-256-GCM encrypted full data backup, decrypt it, migrate an isolated restore schema, restore every table, check row counts and remove the restore schema. `.backups/` and its encryption key are ignored by Git. Store the key separately when moving a backup. The verified drill restored 31 tables and 311 rows; see the evidence file for its actual row count.

Migrations are additive and committed in sequence. Deploy the compatible application only after migration succeeds. Seed is idempotent. Keep release tags and the previous compatible deployment; rollback does not reverse committed accounting data. See the incident runbook for diagnostic and recovery commands.

## Remaining constraints

- GitHub returns HTTP 403 for protected branches on this private Free repository. CODEOWNERS and all five CI checks are active; enabling branch protection requires GitHub Pro or explicit approval to publish the repository. Neither was purchased or changed silently.
- An actual outbound email webhook/provider has not been supplied. The real worker records delivery failures and retries; it never reports an unconfigured transport as a sent email. Configure `EMAIL_WEBHOOK_URL` and `EMAIL_WEBHOOK_TOKEN` to enable delivery. No real external email was sent during verification.
- Free hosting does not provide always-on workers or private ingress between the two web services. The deployment uses authenticated HTTPS and persistent PostgreSQL instead of claiming those paid capabilities.

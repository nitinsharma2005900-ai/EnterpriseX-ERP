# Project 08 assessment verification

Reviewed against the supplied 12-page Project 08 PDF on 27 November 2026. This matrix records implemented evidence and unresolved infrastructure/provider constraints. It does not award a score or treat unavailable paid features as completed.

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


Evidence: `backend/tests/api.test.ts`, `python-service/tests/`, `frontend/tests/`, `frontend/e2e/erp.spec.ts`, versioned Prisma migrations, `.github/workflows/ci.yml`, `docs/test-results.json`, and `docs/backup-verification.json`.

Outbound email delivery is not configured. Protected branches are unavailable on GitHub Free for this private repository. Render free web ingress is public TLS with service authentication, and its worker sleeps with the web process. These qualifications apply to Assessments 08, 10 and 14; they are not hidden by mocks or disabled checks.

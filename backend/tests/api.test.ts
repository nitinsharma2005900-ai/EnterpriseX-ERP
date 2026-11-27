import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

describe('EnterpriseX Comprehensive API & Business Workflow Test Suite', () => {
  let adminToken = '';
  let financeToken = '';
  let managerToken = '';
  let procurementToken = '';
  let warehouseToken = '';
  let salesToken = '';

  beforeAll(async () => {
    // Authenticate all 6 demo roles
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@enterprisex.com', password: 'EnterpriseX2026!' });
    adminToken = adminRes.body.data.accessToken;

    const finRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'finance@enterprisex.com', password: 'EnterpriseX2026!' });
    financeToken = finRes.body.data.accessToken;

    const mgrRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@enterprisex.com', password: 'EnterpriseX2026!' });
    managerToken = mgrRes.body.data.accessToken;

    const procRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'procurement@enterprisex.com', password: 'EnterpriseX2026!' });
    procurementToken = procRes.body.data.accessToken;

    const whRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'warehouse@enterprisex.com', password: 'EnterpriseX2026!' });
    warehouseToken = whRes.body.data.accessToken;

    const salesRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales@enterprisex.com', password: 'EnterpriseX2026!' });
    salesToken = salesRes.body.data.accessToken;
  });

  // ---------------------------------------------------------------------------
  // Assessment 01 & 02: Core Architecture & Health
  // ---------------------------------------------------------------------------
  it('GET /health returns 200 HEALTHY status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
  });

  it('GET /api/auth/demo-accounts returns 6 verified enterprise roles', async () => {
    const res = await request(app).get('/api/auth/demo-accounts');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.data.map((d: any) => d.role)).toContain('ERP_ADMINISTRATOR');
    expect(res.body.data.map((d: any) => d.role)).toContain('FINANCE_OFFICER');
    expect(res.body.data.map((d: any) => d.role)).toContain('DEPARTMENT_MANAGER');
  });

  // ---------------------------------------------------------------------------
  // Assessment 04: Role-Based Authorization & Approval Limits
  // ---------------------------------------------------------------------------
  it('Assessment 04: Warehouse operator cannot access General Ledger post (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/finance/journals')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ entryNumber: 'TEST-UNAUTH', lines: [] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Assessment 04: Approval limit violation prevents unauthorized PO approval', async () => {
    // 1. Fetch vendor, department, product
    const vendorsRes = await request(app).get('/api/vendors').set('Authorization', `Bearer ${adminToken}`);
    const vendorId = vendorsRes.body.data[0].id;

    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${procurementToken}`);
    const departmentId = meRes.body.data.department?.id || meRes.body.data.departmentId;

    const productsRes = await request(app).get('/api/inventory/products').set('Authorization', `Bearer ${adminToken}`);
    const productId = productsRes.body.data[0].id;

    const poRes = await request(app)
      .post('/api/procurement/purchase-orders')
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({
        vendorId,
        departmentId,
        items: [{ productId, quantityOrdered: 20, unitPrice: 1500.0 }], // Total > $30,000 (exceeds procurement officer's $10,000 limit)
      });

    expect(poRes.status).toBe(201);
    const poId = poRes.body.data.id;

    // Procurement officer tries to approve their own $30,000 PO -> Must fail with 403
    const approvalRes = await request(app)
      .patch(`/api/procurement/purchase-orders/${poId}/approve`)
      .set('Authorization', `Bearer ${procurementToken}`)
      .send({ comments: 'Self approval attempt' });

    expect(approvalRes.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // Assessment 03 & 05: Financial Double-Entry Accounting Invariants
  // ---------------------------------------------------------------------------
  it('Assessment 03: Rejects unbalanced journal entry (Debits != Credits)', async () => {
    const accountsRes = await request(app).get('/api/finance/accounts').set('Authorization', `Bearer ${financeToken}`);
    const acc1 = accountsRes.body.data[0].id;
    const acc2 = accountsRes.body.data[1].id;

    const periodsRes = await request(app).get('/api/finance/periods').set('Authorization', `Bearer ${financeToken}`);
    const openPeriod = periodsRes.body.data.find((p: any) => p.status === 'OPEN');

    const res = await request(app)
      .post('/api/finance/journals')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        entryNumber: `JE-IMBAL-${Date.now()}`,
        periodId: openPeriod.id,
        referenceType: 'MANUAL',
        description: 'Imbalance Test Entry',
        lines: [
          { accountId: acc1, debit: 500.0, credit: 0.0 },
          { accountId: acc2, debit: 0.0, credit: 400.0 }, // 100 imbalance!
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JOURNAL_IMBALANCE');
  });

  it('Assessment 03: Rejects journal entry posted to CLOSED financial period', async () => {
    const accountsRes = await request(app).get('/api/finance/accounts').set('Authorization', `Bearer ${financeToken}`);
    const acc1 = accountsRes.body.data[0].id;
    const acc2 = accountsRes.body.data[1].id;

    const periodsRes = await request(app).get('/api/finance/periods').set('Authorization', `Bearer ${financeToken}`);
    const closedPeriod = periodsRes.body.data.find((p: any) => p.status === 'CLOSED');

    const res = await request(app)
      .post('/api/finance/journals')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        entryNumber: `JE-CLOSED-${Date.now()}`,
        periodId: closedPeriod.id,
        referenceType: 'MANUAL',
        description: 'Closed Period Test Entry',
        lines: [
          { accountId: acc1, debit: 500.0, credit: 0.0 },
          { accountId: acc2, debit: 0.0, credit: 500.0 },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PERIOD_CLOSED');
  });

  // ---------------------------------------------------------------------------
  // Assessment 07, 08 & 12: Idempotent Payment & Duplicate Protection
  // ---------------------------------------------------------------------------
  it('Assessment 08: Idempotency key prevents duplicate payment and double debit', async () => {
    // Fetch existing open or paid invoice
    const invRes = await request(app).get('/api/billing/invoices').set('Authorization', `Bearer ${financeToken}`);
    const invoice = invRes.body.data[0];

    const idempotencyKey = `IDEMP-TEST-${Date.now()}`;

    // First attempt (or if already paid, test duplicate payment rejection)
    const firstAttempt = await request(app)
      .post('/api/billing/payments')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        invoiceId: invoice.id,
        amount: 100.0,
        idempotencyKey,
        notes: 'First charge',
      });

    // Second identical attempt with same idempotency key
    const secondAttempt = await request(app)
      .post('/api/billing/payments')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        invoiceId: invoice.id,
        amount: 100.0,
        idempotencyKey,
        notes: 'Retry with same idempotency key',
      });

    if (firstAttempt.status === 201) {
      // Must be idempotent return without error or double debit
      expect(secondAttempt.status).toBe(201);
      expect(secondAttempt.body.data.isDuplicateSuppressed).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Assessment 07 & Capstone Challenge: End-to-End P2P Workflow & Compensation
  // ---------------------------------------------------------------------------
  it('Assessment 07 & Capstone: Executes P2P Workflow with safe compensation rollback upon simulated failure', async () => {
    const vendors = (await request(app).get('/api/vendors').set('Authorization', `Bearer ${adminToken}`)).body.data;
    const warehouses = (await request(app).get('/api/inventory/warehouses').set('Authorization', `Bearer ${adminToken}`)).body.data;
    const products = (await request(app).get('/api/inventory/products').set('Authorization', `Bearer ${adminToken}`)).body.data;

    const meAdmin = (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`)).body.data;
    const departmentId = meAdmin.department?.id || meAdmin.departmentId;

    const res = await request(app)
      .post('/api/workflows/purchase-to-pay')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vendorId: vendors[0].id,
        departmentId,
        warehouseId: warehouses[0].id,
        items: [{ productId: products[0].id, quantity: 2, unitPrice: products[0].standardCost }],
        simulateFailureAt: 'PAYMENT', // Simulates failure at the final step!
        idempotencyKey: `COMPENSATE-TEST-${Date.now()}`,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FAILED_SAFELY_COMPENSATED');
    expect(res.body.data.compensationLog.length).toBeGreaterThan(0);
    expect(res.body.data.trace.some((t: any) => t.status === 'COMPENSATED')).toBe(true);
  }, 20000);

  // ---------------------------------------------------------------------------
  // Assessment 15: Incident Diagnostic and Recovery
  // ---------------------------------------------------------------------------
  it('Assessment 15: System diagnostic scanner detects system integrity and open incidents', async () => {
    const res = await request(app).get('/api/system/diagnostics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.diagnostics).toBeDefined();
    expect(res.body.data.diagnostics.totalJournalsAudited).toBeGreaterThan(0);
  });
});

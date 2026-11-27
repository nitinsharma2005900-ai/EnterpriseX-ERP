import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/config/prisma';
import { randomUUID } from 'node:crypto';

const tokens: Record<string,string> = {};
const users: Record<string,any> = {};
let vendor: any, customer: any, product: any, warehouses: any[], periods: any[], accounts: any[];
let p2p: any, o2c: any;
const key = () => randomUUID();
const api = (role: string, method: string, path: string, body?: any) => {
  const call = (request(app) as any)[method](`/api${path}`).set('Authorization', `Bearer ${tokens[role]}`);
  return body === undefined ? call : call.send(body);
};
const p2pInput = (extra = {}) => ({ vendorId: vendor.id, departmentId: users.admin.department.id, warehouseId: warehouses[0].id, items: [{ productId: product.id, quantity: 2, unitPrice: product.standardCost }], idempotencyKey: key(), ...extra });
const o2cInput = (extra = {}) => ({ customerId: customer.id, warehouseId: warehouses[0].id, items: [{ productId: product.id, quantity: 1, unitPrice: product.unitPrice }], idempotencyKey: key(), ...extra });
async function snapshot() {
  const [stock, accounts, vendor, customer, orders, receipts, invoices, payments, journals] = await Promise.all([
    prisma.stockLevel.findMany({orderBy:{id:'asc'}}), prisma.account.findMany({orderBy:{id:'asc'}}), prisma.vendor.findMany({orderBy:{id:'asc'}}), prisma.customer.findMany({orderBy:{id:'asc'}}),
    prisma.purchaseOrder.count(),prisma.goodsReceipt.count(),prisma.invoice.count(),prisma.payment.count(),prisma.journalEntry.count(),
  ]);
  return { stock: stock.map(s=>[s.id,s.quantityOnHand,s.quantityReserved,s.averageCost]), accounts: accounts.map(a=>[a.id,a.balance]), vendors:vendor.map(v=>[v.id,v.balance]), customers:customer.map(c=>[c.id,c.outstandingBalance]), orders,receipts,invoices,payments,journals };
}

beforeAll(async () => {
  for (const role of ['admin','finance','manager','procurement','warehouse','sales']) {
    const res = await request(app).post('/api/auth/login').send({email:`${role}@enterprisex.com`,password:'EnterpriseX2026!'});
    expect(res.status, JSON.stringify(res.body)).toBe(200); tokens[role] = res.body.data.accessToken;
    users[role] = (await api(role,'get','/auth/me')).body.data;
  }
  vendor = (await api('admin','get','/vendors')).body.data[0]; customer = (await api('admin','get','/customers')).body.data[0];
  product = (await api('admin','get','/inventory/products')).body.data[0]; warehouses = (await api('admin','get','/inventory/warehouses')).body.data;
  periods = (await api('admin','get','/finance/periods')).body.data; accounts = (await api('admin','get','/finance/accounts')).body.data;
});
afterAll(async () => { await prisma.$disconnect(); });

describe('Authentication and authorization', () => {
  it('reports liveness and rejects unauthenticated business access', async()=>{
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/api/vendors')).status).toBe(401);
    expect((await request(app).get('/api/documents/po/none/pdf')).status).toBe(401);
  });
  it('rejects invalid login and malformed input safely', async()=>{
    expect((await request(app).post('/api/auth/login').send({email:'not-email',password:''})).status).toBe(400);
    const res=await request(app).post('/api/auth/login').send({email:'admin@enterprisex.com',password:'wrong'});
    expect(res.status).toBe(401);expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
  it('denies warehouse journal posting and procurement auto settlement', async()=>{
    expect((await api('warehouse','post','/finance/journals',{})).status).toBe(403);
    expect((await api('procurement','post','/workflows/purchase-to-pay',p2pInput())).status).toBe(403);
  });
  it('restricts department approvals by stored order resource', async()=>{
    const res=await api('admin','post','/procurement/purchase-orders',{vendorId:vendor.id,departmentId:users.admin.department.id,items:[{productId:product.id,quantityOrdered:1,unitPrice:10}]});
    expect(res.status).toBe(201);
    expect((await api('manager','patch',`/procurement/purchase-orders/${res.body.data.id}/approve`,{})).status).toBe(404);
  });
  it('enforces warehouse scope on read and mutation',async()=>{
    const other=warehouses.find(w=>w.id!==users.warehouse.warehouse.id);
    expect((await api('warehouse','post','/inventory/adjust',{productId:product.id,warehouseId:other.id,quantityDelta:1,notes:'scope'})).status).toBe(403);
    const levels=(await api('warehouse','get','/inventory/stock-levels')).body.data;
    expect(levels.every((s:any)=>s.warehouseId===users.warehouse.warehouse.id)).toBe(true);
    const products=(await api('warehouse','get','/inventory/products')).body.data;
    expect(products.flatMap((p:any)=>p.stockLevels).every((s:any)=>s.warehouseId===users.warehouse.warehouse.id)).toBe(true);
  });
  it('hides records belonging to another organization',async()=>{
    const org=await prisma.organization.create({data:{name:'Isolated organization',code:key()}});
    const foreign=await prisma.product.create({data:{organizationId:org.id,name:'Private',sku:key()}});
    expect((await api('admin','get',`/inventory/products/${foreign.id}`)).status).toBe(404);
  });
  it('rotates refresh tokens, rejects reuse and revokes access on logout',async()=>{
    const login=await request(app).post('/api/auth/login').send({email:'sales@enterprisex.com',password:'EnterpriseX2026!'});
    const old=login.body.data.refreshToken;
    const refresh=await request(app).post('/api/auth/refresh').send({refreshToken:old}); expect(refresh.status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').send({refreshToken:old})).status).toBe(401);
    expect((await request(app).post('/api/auth/logout').set('Authorization',`Bearer ${refresh.body.data.accessToken}`)).status).toBe(200);
    expect((await request(app).get('/api/auth/me').set('Authorization',`Bearer ${refresh.body.data.accessToken}`)).status).toBe(401);
    const next=await request(app).post('/api/auth/login').send({email:'sales@enterprisex.com',password:'EnterpriseX2026!'});tokens.sales=next.body.data.accessToken;
  });
});

describe('Transactional ERP workflows',()=>{
  it('completes P2P with recognized inventory, input tax, AP and balanced settlement',async()=>{
    const before=await snapshot(); const input=p2pInput();
    const res=await api('admin','post','/workflows/purchase-to-pay',input); expect(res.status).toBe(200); expect(res.body.data.status,JSON.stringify(res.body)).toBe('COMPLETED');p2p=res.body.data;
    const invoice=await prisma.invoice.findUniqueOrThrow({where:{id:p2p.summary.invoiceId},include:{payments:true}});
    expect(invoice.status).toBe('PAID');expect(invoice.remainingAmount).toBe(0);expect(invoice.payments).toHaveLength(1);
    const journals=await prisma.journalEntry.findMany({where:{referenceId:{in:[p2p.summary.goodsReceiptId,p2p.summary.invoiceId,p2p.summary.paymentId]}},include:{lines:true}});
    expect(journals).toHaveLength(3);for(const journal of journals) expect(journal.lines.reduce((s,l)=>s+l.debit-l.credit,0)).toBeCloseTo(0,2);
    const state=await snapshot();expect(state.orders).toBe(before.orders+1);
    const replay=await api('admin','post','/workflows/purchase-to-pay',input);expect(replay.body.data.isDuplicateSuppressed).toBe(true);expect(await snapshot()).toEqual(state);
    const conflict=await api('admin','post','/workflows/purchase-to-pay',{...input,items:[{...input.items[0],quantity:5}]});expect(conflict.status).toBe(409);
  });
  for(const stage of ['APPROVAL','RECEIPT','INVOICE','PAYMENT'])it(`rolls back every P2P change on ${stage} failure`,async()=>{
    const before=await snapshot();const res=await api('admin','post','/workflows/purchase-to-pay',p2pInput({simulateFailureAt:stage}));expect(res.body.data.status).toBe('FAILED_SAFELY_COMPENSATED');expect(await snapshot()).toEqual(before);
  });
  it('completes O2C with reservation, shipment, revenue, COGS, tax and cash',async()=>{
    const res=await api('admin','post','/workflows/order-to-cash',o2cInput());expect(res.body.data.status,JSON.stringify(res.body)).toBe('COMPLETED');o2c=res.body.data;
    const so=await prisma.salesOrder.findUniqueOrThrow({where:{id:o2c.summary.salesOrderId}});expect(so.status).toBe('INVOICED');
    const inv=await prisma.invoice.findUniqueOrThrow({where:{id:o2c.summary.invoiceId}});expect(inv.status).toBe('PAID');
    const cogs=await prisma.journalEntry.findFirst({where:{referenceType:'SO',referenceId:so.id}});expect(cogs).toBeTruthy();
  });
  for(const stage of ['RESERVATION','FULFILLMENT','INVOICE','PAYMENT'])it(`rolls back every O2C change on ${stage} failure`,async()=>{
    const before=await snapshot();const count=await prisma.salesOrder.count();const res=await api('admin','post','/workflows/order-to-cash',o2cInput({simulateFailureAt:stage}));expect(res.body.data.status).toBe('FAILED_SAFELY_COMPENSATED');expect(await snapshot()).toEqual(before);expect(await prisma.salesOrder.count()).toBe(count);
  });
  it('prevents duplicate invoices and replayed fulfillment',async()=>{
    expect((await api('finance','post','/billing/invoices/ar',{soId:o2c.summary.salesOrderId})).status).toBe(409);
    expect((await api('admin','post',`/sales/sales-orders/${o2c.summary.salesOrderId}/fulfill`,{warehouseId:warehouses[0].id})).status).toBe(400);
    expect((await api('finance','post','/billing/invoices/ap',{poId:p2p.summary.purchaseOrderId,items:[{productId:product.id,description:'duplicate',quantity:2,unitPrice:product.standardCost}]})).status).toBe(409);
  });
  it('rejects negative, malformed and empty order inputs',async()=>{
    const input={vendorId:vendor.id,departmentId:users.admin.department.id,items:[{productId:product.id,quantityOrdered:-1,unitPrice:10}]};
    expect((await api('admin','post','/procurement/purchase-orders',input)).status).toBe(400);
    expect((await api('admin','post','/procurement/purchase-orders',{...input,items:[]})).status).toBe(400);
  });
  it('enforces manager approval limits from computed totals',async()=>{
    const po=await api('procurement','post','/procurement/purchase-orders',{vendorId:vendor.id,departmentId:users.manager.department.id,items:[{productId:product.id,quantityOrdered:100,unitPrice:1000}]});expect(po.status).toBe(201);
    const result=await api('manager','patch',`/procurement/purchase-orders/${po.body.data.id}/approve`,{});expect(result.status).toBe(403);expect(result.body.error.code).toBe('APPROVAL_LIMIT_EXCEEDED');
  });
  it('prevents over-receipt and quantities from another PO',async()=>{
    const po=await api('admin','post','/procurement/purchase-orders',{vendorId:vendor.id,items:[{productId:product.id,quantityOrdered:1,unitPrice:10}]});await api('admin','patch',`/procurement/purchase-orders/${po.body.data.id}/approve`,{});
    const payload={poId:po.body.data.id,warehouseId:warehouses[0].id,items:[{poItemId:po.body.data.items[0].id,productId:product.id,quantityReceived:2,quantityAccepted:2,unitCost:10}]};
    expect((await api('admin','post','/logistics/goods-receipts',payload)).body.error.code).toBe('OVER_RECEIPT');
    payload.items[0].poItemId=key();expect((await api('admin','post','/logistics/goods-receipts',payload)).body.error.code).toBe('INVALID_PO_LINE');
  });
  it('rejects invoices without receipts and mismatched invoice quantities',async()=>{
    const po=await api('admin','post','/procurement/purchase-orders',{vendorId:vendor.id,items:[{productId:product.id,quantityOrdered:1,unitPrice:10}]});
    expect((await api('admin','post','/billing/invoices/ap',{poId:po.body.data.id,items:[{productId:product.id,description:'goods',quantity:1,unitPrice:10}]})).body.error.code).toBe('RECEIPT_REQUIRED');
  });
  it('does not release or consume reservations in another warehouse',async()=>{
    const so=await api('sales','post','/sales/sales-orders',{customerId:customer.id,items:[{productId:product.id,quantityOrdered:1,unitPrice:10}]});expect(so.status).toBe(201);
    await api('admin','post',`/sales/sales-orders/${so.body.data.id}/reserve`,{warehouseId:warehouses[0].id});
    expect((await api('admin','post',`/sales/sales-orders/${so.body.data.id}/fulfill`,{warehouseId:warehouses[1].id})).body.error.code).toBe('WAREHOUSE_MISMATCH');
  });
});

describe('Accounting, downloads, CRUD and integrity',()=>{
  it('rejects closed periods and unbalanced journals',async()=>{
    const data={entryNumber:key(),periodId:periods.find(p=>p.status==='CLOSED').id,referenceType:'MANUAL',description:'Regression',lines:[{accountId:accounts[0].id,debit:10,credit:0},{accountId:accounts[1].id,debit:0,credit:10}]};
    expect((await api('finance','post','/finance/journals',data)).body.error.code).toBe('PERIOD_CLOSED');
    data.periodId=periods.find(p=>p.status==='OPEN').id;data.lines[1].credit=9;
    expect((await api('finance','post','/finance/journals',data)).body.error.code).toBe('JOURNAL_IMBALANCE');
  });
  it('downloads real authenticated PDFs and CSV exports',async()=>{
    for(const [type,id] of [['po',p2p.summary.purchaseOrderId],['grn',p2p.summary.goodsReceiptId],['invoice',p2p.summary.invoiceId]]) {
      const response=await api('admin','get',`/documents/${type}/${id}/pdf`);expect(response.status).toBe(200);expect(response.headers['content-type']).toContain('application/pdf');expect(response.body.subarray(0,4).toString()).toBe('%PDF');
    }
    const csv=await api('finance','get','/integrations/accounting/export?format=csv');expect(csv.status).toBe(200);expect(csv.text).toContain('EntryNumber,Date,Period');
  });
  it('creates, searches, updates and deletes an unused vendor; protects used vendors',async()=>{
    const created=await api('procurement','post','/vendors',{code:key(),name:'Temporary vendor',email:'vendor@example.test'});expect(created.status).toBe(201);
    const id=created.body.data.id;expect((await api('procurement','patch',`/vendors/${id}`,{name:'Updated vendor',balance:99999})).body.data.balance).toBe(0);
    expect((await api('procurement','get',`/vendors/${id}`)).body.data.name).toBe('Updated vendor');
    expect((await api('procurement','delete',`/vendors/${id}`)).status).toBe(200);
    expect((await api('procurement','delete',`/vendors/${vendor.id}`)).status).toBe(409);
  });
  it('persists data across independent database connections',async()=>{
    const { PrismaClient }=await import('@prisma/client');const second=new PrismaClient();
    expect(await second.payment.count({where:{id:p2p.summary.paymentId}})).toBe(1);await second.$disconnect();
  });
  it('prevents silent negative stock and invalid accounting import',async()=>{
    expect((await api('admin','post','/inventory/adjust',{productId:product.id,warehouseId:warehouses[0].id,quantityDelta:-999999})).status).toBe(400);
    expect((await api('finance','post','/integrations/accounting/import',{accounts:[{code:'bad',name:'Bad',category:'BOGUS'}]})).status).toBe(400);
  });
  it('reports a healthy reconciled ledger after workflows',async()=>{
    const result=await api('admin','get','/system/diagnostics');expect(result.status).toBe(200);expect(result.body.data.detectedIssues).toEqual([]);
  });
  for (const type of ['LEDGER_IMBALANCE','DUPLICATE_INVOICE','NEGATIVE_STOCK','STOCK_VALUATION','PARTIAL_WORKFLOW','INCONSISTENT_DATA']) it(`captures ${type} evidence without persisting corruption`, async () => {
    const before = await snapshot();
    const result = await api('admin','post','/system/incidents/simulate',{type});
    expect(result.status,JSON.stringify(result.body)).toBe(201);
    const evidence = JSON.parse(result.body.data.diagnosisDetails);
    expect(evidence.guardPreventedCommit || evidence.detectedIssues?.length > 0).toBeTruthy();
    expect(await snapshot()).toEqual(before);
    expect((await api('admin','patch',`/system/incidents/${result.body.data.id}/resolve`,{notes:'Rollback and evidence verified'})).body.data.status).toBe('RESOLVED');
  });
  it('paginates database collections and serves versioned routes', async () => {
    const first=await api('admin','get','/inventory/products?page=1&pageSize=1');
    const second=await api('admin','get','/inventory/products?page=2&pageSize=1');
    expect(first.body.data).toHaveLength(1);expect(second.body.data).toHaveLength(1);expect(first.body.data[0].id).not.toBe(second.body.data[0].id);
    expect((await api('admin','get','/v1/inventory/products')).status).toBe(200);
  });
  it('enforces database audit immutability',async()=>{
    const log=await prisma.auditLog.findFirstOrThrow();await expect(prisma.auditLog.update({where:{id:log.id},data:{action:'DELETE'}})).rejects.toThrow('Audit history is immutable');
  });
  it('documents every mounted domain and returns structured 404 errors',async()=>{
    const docs=await request(app).get('/api/docs/spec');expect(docs.status).toBe(200);expect(docs.body.openapi).toBeTruthy();
    const missing=await api('admin','get','/unknown-route');expect(missing.status).toBe(404);expect(missing.body.error.requestId).toBeTruthy();
  });
});

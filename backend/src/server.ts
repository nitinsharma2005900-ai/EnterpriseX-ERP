import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';

// Modules
import authRoutes from './modules/auth/auth.routes';
import accountsRoutes from './modules/accounts/accounts.routes';
import vendorsRoutes from './modules/vendors/vendors.routes';
import customersRoutes from './modules/customers/customers.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import procurementRoutes from './modules/procurement/procurement.routes';
import receiptRoutes from './modules/receipt/receipt.routes';
import salesRoutes from './modules/sales/sales.routes';
import billingRoutes from './modules/billing/billing.routes';
import workflowsRoutes from './modules/workflows/workflows.routes';
import integrationsRoutes from './modules/integrations/integrations.routes';
import auditRoutes from './modules/audit/audit.routes';
import reportsRoutes from './modules/reports/reports.routes';
import healthRoutes from './modules/health/health.routes';

// Document generation
import { generateTransactionHTML } from './utils/pdfGenerator';
import { prisma } from './config/prisma';

export const app = express();

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestIdMiddleware);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}

// Liveness probe
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'enterprisex-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount module routes
app.use('/api/auth', authRoutes);
app.use('/api/finance', accountsRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/logistics', receiptRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/system', healthRoutes);

// Document View & Printable PDF Routes
app.get('/api/documents/po/:id/pdf', async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { vendor: true, items: { include: { product: true } } },
    });
    if (!po) return res.status(404).send('PO not found');
    const html = generateTransactionHTML('PO', po);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

app.get('/api/documents/invoice/:id/pdf', async (req, res, next) => {
  try {
    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { vendor: true, customer: true, items: { include: { product: true } } },
    });
    if (!inv) return res.status(404).send('Invoice not found');
    const html = generateTransactionHTML('INVOICE', inv);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

app.get('/api/documents/grn/:id/pdf', async (req, res, next) => {
  try {
    const grn = await prisma.goodsReceipt.findUnique({
      where: { id: req.params.id },
      include: { purchaseOrder: { include: { vendor: true } }, items: { include: { product: true } } },
    });
    if (!grn) return res.status(404).send('GRN not found');
    const html = generateTransactionHTML('GRN', grn);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

// Swagger / OpenAPI specification
app.get('/api/docs/spec', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'EnterpriseX Integrated ERP API',
      version: '1.0.0',
      description: 'Authoritative REST API specification for EnterpriseX: Finance, Procurement, Inventory, Sales, and Workflows.',
    },
    paths: {
      '/api/auth/login': { post: { summary: 'User login with JWT generation' } },
      '/api/auth/demo-accounts': { get: { summary: 'Retrieve pre-configured synthetic demo accounts' } },
      '/api/finance/accounts': { get: { summary: 'List Chart of Accounts' }, post: { summary: 'Create new GL Account' } },
      '/api/finance/journals': { post: { summary: 'Post balanced double-entry journal entry' } },
      '/api/procurement/purchase-orders': { get: { summary: 'List purchase orders' }, post: { summary: 'Create purchase order' } },
      '/api/logistics/goods-receipts': { post: { summary: 'Receive goods and update inventory' } },
      '/api/sales/sales-orders': { post: { summary: 'Create sales order with credit check' } },
      '/api/billing/invoices/ap': { post: { summary: 'Create AP Invoice with 3-Way Matching' } },
      '/api/billing/payments': { post: { summary: 'Record idempotent payment and auto-post GL journal' } },
      '/api/workflows/purchase-to-pay': { post: { summary: 'Execute atomic P2P workflow with compensation' } },
      '/api/system/diagnostics': { get: { summary: 'Run integrity diagnostics' } },
    },
  });
});

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(`🚀 EnterpriseX Primary Business API running on http://localhost:${config.port}`);
  });
}

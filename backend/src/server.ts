import { buildApiSpec } from './apiSpec';
import rateLimit from 'express-rate-limit';
import { authenticate } from './middleware/auth';
import { requireRole, Roles } from './middleware/rbac';
import { transactionPDF } from './modules/integrations/documents';
import { startWorker, stopWorker } from './modules/integrations/jobs';
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
import { masterRoutes } from './modules/master.routes';

// Document generation
import { generateTransactionHTML } from './utils/pdfGenerator';
import { prisma } from './config/prisma';

export const app = express();

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.set('trust proxy', 1);
app.use(cors({ origin: config.frontendUrl.split(','), credentials: true }));
app.use('/api/auth/login', rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestIdMiddleware);
app.use((req, _res, next) => { if (req.url.startsWith('/api/v1/')) req.url = req.url.replace('/api/v1/', '/api/'); next(); });
app.use((req, res, next) => {
  const original = res.json.bind(res);
  res.json = (body: any) => {
    if (body?.data && Array.isArray(body.data)) {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 100));
      body = { ...body, pagination: { page, pageSize, hasMore: body.data.length === pageSize } };
    }
    const clean = JSON.parse(JSON.stringify(body, (key, value) => ['passwordHash','tokenHash','tokenVersion'].includes(key) ? undefined : value));
    return original(clean);
  };
  next();
});

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

// Documents are binary PDF attachments; authentication and resource scope apply.
app.get('/api/documents/:type/:id/pdf', authenticate, async (req, res, next) => {
  try {
    const content = await transactionPDF(req.params.type, req.params.id);
    res.type('application/pdf').attachment(`${req.params.type}-${req.params.id}.pdf`).send(content);
  } catch (err) { next(err); }
});

// Swagger / OpenAPI specification
app.get('/api/docs/spec', (_req, res) => res.json(buildApiSpec([
  ['/api/auth',authRoutes], ['/api/finance',accountsRoutes], ['/api/vendors',vendorsRoutes], ['/api/customers',customersRoutes],
  ['/api/inventory',inventoryRoutes], ['/api/procurement',procurementRoutes], ['/api/logistics',receiptRoutes], ['/api/sales',salesRoutes],
  ['/api/billing',billingRoutes], ['/api/workflows',workflowsRoutes], ['/api/integrations',integrationsRoutes], ['/api/audit',auditRoutes],
  ['/api/reports',reportsRoutes], ['/api/system',healthRoutes], ['/api',masterRoutes],
])));

app.use('/api', masterRoutes);
app.use((_req, _res, next) => next(Object.assign(new Error('API route not found'), { statusCode: 404, code: 'NOT_FOUND' })));
// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`🚀 EnterpriseX Primary Business API running on http://localhost:${config.port}`);
  });
  startWorker().catch(error => logger.error('Worker startup failed', { message: error.message }));
  const shutdown = () => server.close(async () => { await stopWorker(); await prisma.$disconnect(); process.exit(0); });
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
export default app;

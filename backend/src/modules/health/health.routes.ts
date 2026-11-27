import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { HealthController } from './health.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();

// Unauthenticated liveness probe for Docker / Kubernetes health checks
router.get('/health', HealthController.getHealth);
router.get('/readiness', HealthController.getHealth);

// Authenticated incident management and diagnostics (Assessment 14 & 15)
router.use(authenticate);

router.get('/diagnostics', requireRole(Roles.ADMIN), HealthController.runDiagnostics);
router.get('/incidents', requireRole(Roles.ADMIN), HealthController.getIncidents);
router.post('/incidents/simulate', requireRole(Roles.ADMIN), validate(z.object({ type: z.enum(['LEDGER_IMBALANCE','DUPLICATE_INVOICE','NEGATIVE_STOCK','PARTIAL_WORKFLOW','STOCK_VALUATION','INCONSISTENT_DATA']) })), HealthController.simulateIncident);
router.patch('/incidents/:id/resolve', requireRole(Roles.ADMIN), validate(z.object({ notes: text.optional() })), HealthController.resolveIncident);

export default router;

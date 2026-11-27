import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { IntegrationsController } from './integrations.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.post('/email/send', validate(z.object({ to: z.string().email(), subject: text, body: text, idempotencyKey: text.optional() })), IntegrationsController.sendEmail);
router.get('/email/queue', IntegrationsController.getEmailQueue);
router.post('/vendor-simulator/dispatch', validate(z.object({ poNumber: text })), IntegrationsController.simulateVendorDispatch);
router.get('/accounting/export', requireRole(Roles.ADMIN, Roles.FINANCE), IntegrationsController.exportAccounting);
router.post('/accounting/import', requireRole(Roles.ADMIN, Roles.FINANCE), IntegrationsController.importAccounting);

export default router;

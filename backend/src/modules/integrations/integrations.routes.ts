import { Router } from 'express';
import { IntegrationsController } from './integrations.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.post('/email/send', IntegrationsController.sendEmail);
router.get('/email/queue', IntegrationsController.getEmailQueue);
router.post('/vendor-simulator/dispatch', IntegrationsController.simulateVendorDispatch);
router.get('/accounting/export', requireRole(Roles.ADMIN, Roles.FINANCE), IntegrationsController.exportAccounting);
router.post('/accounting/import', requireRole(Roles.ADMIN, Roles.FINANCE), IntegrationsController.importAccounting);

export default router;

import { Router } from 'express';
import { WorkflowController } from './workflows.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.post('/purchase-to-pay', requireRole(Roles.ADMIN, Roles.PROCUREMENT, Roles.FINANCE), WorkflowController.runPurchaseToPay);
router.post('/order-to-cash', requireRole(Roles.ADMIN, Roles.SALES, Roles.FINANCE), WorkflowController.runOrderToCash);

export default router;

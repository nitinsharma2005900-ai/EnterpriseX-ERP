import { Router } from 'express';
import { ProcurementController } from './procurement.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/purchase-orders', ProcurementController.getPurchaseOrders);
router.get('/purchase-orders/:id', ProcurementController.getPurchaseOrderById);
router.post(
  '/purchase-orders',
  requireRole(Roles.ADMIN, Roles.PROCUREMENT, Roles.DEPT_MANAGER),
  ProcurementController.createPurchaseOrder
);
router.patch(
  '/purchase-orders/:id/approve',
  requireRole(Roles.ADMIN, Roles.FINANCE, Roles.DEPT_MANAGER),
  ProcurementController.approvePurchaseOrder
);
router.patch(
  '/purchase-orders/:id/reject',
  requireRole(Roles.ADMIN, Roles.FINANCE, Roles.DEPT_MANAGER),
  ProcurementController.rejectPurchaseOrder
);

export default router;

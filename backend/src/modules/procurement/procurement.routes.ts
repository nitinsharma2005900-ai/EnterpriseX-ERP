import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
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
  validate(z.object({ vendorId: id, departmentId: id.optional(), expectedDeliveryDate: z.coerce.date().optional(), terms: text.optional(), items: items(orderItem) })), ProcurementController.createPurchaseOrder
);
router.patch(
  '/purchase-orders/:id/approve',
  requireRole(Roles.ADMIN, Roles.FINANCE, Roles.DEPT_MANAGER),
  validate(z.object({ comments: text.optional() })), ProcurementController.approvePurchaseOrder
);
router.patch(
  '/purchase-orders/:id/reject',
  requireRole(Roles.ADMIN, Roles.FINANCE, Roles.DEPT_MANAGER),
  validate(z.object({ comments: text })), ProcurementController.rejectPurchaseOrder
);

export default router;

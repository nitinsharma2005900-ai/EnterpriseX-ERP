import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { WorkflowController } from './workflows.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.post('/purchase-to-pay', requireRole(Roles.ADMIN, Roles.FINANCE), validate(z.object({ vendorId: id, departmentId: id, warehouseId: id, items: items(z.object({ productId: id, quantity: positive, unitPrice: money })), idempotencyKey: text, simulateFailureAt: z.enum(['NONE','APPROVAL','RECEIPT','INVOICE','PAYMENT']).optional() })), WorkflowController.runPurchaseToPay);
router.post('/order-to-cash', requireRole(Roles.ADMIN, Roles.FINANCE), validate(z.object({ customerId: id, warehouseId: id, items: items(z.object({ productId: id, quantity: positive, unitPrice: money })), idempotencyKey: text, simulateFailureAt: z.enum(['NONE','RESERVATION','FULFILLMENT','INVOICE','PAYMENT']).optional() })), WorkflowController.runOrderToCash);

export default router;

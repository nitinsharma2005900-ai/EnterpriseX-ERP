import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/sales-orders', SalesController.getSalesOrders);
router.get('/sales-orders/:id', SalesController.getSalesOrderById);
router.post('/sales-orders', requireRole(Roles.ADMIN, Roles.SALES), SalesController.createSalesOrder);
router.post('/sales-orders/:id/reserve', requireRole(Roles.ADMIN, Roles.SALES, Roles.WAREHOUSE), SalesController.reserveStock);
router.post('/sales-orders/:id/fulfill', requireRole(Roles.ADMIN, Roles.WAREHOUSE), SalesController.fulfillSalesOrder);

export default router;

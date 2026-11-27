import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, enforceScope, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);
router.use(enforceScope({ checkWarehouse: true }));

router.get('/sales-orders', SalesController.getSalesOrders);
router.get('/sales-orders/:id', SalesController.getSalesOrderById);
router.post('/sales-orders', requireRole(Roles.ADMIN, Roles.SALES), validate(z.object({ customerId: id, shippingAddress: text.optional(), expectedShipDate: z.coerce.date().optional(), items: items(orderItem) })), SalesController.createSalesOrder);
router.post('/sales-orders/:id/reserve', requireRole(Roles.ADMIN, Roles.SALES, Roles.WAREHOUSE), validate(z.object({ warehouseId: id })), SalesController.reserveStock);
router.post('/sales-orders/:id/fulfill', requireRole(Roles.ADMIN, Roles.WAREHOUSE), validate(z.object({ warehouseId: id })), SalesController.fulfillSalesOrder);

export default router;

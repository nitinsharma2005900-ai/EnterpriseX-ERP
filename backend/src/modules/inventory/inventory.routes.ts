import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, enforceScope, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);
router.use(enforceScope({ checkWarehouse: true }));

router.get('/products', InventoryController.getProducts);
router.get('/products/:id', InventoryController.getProductById);
router.post('/products', requireRole(Roles.ADMIN, Roles.PROCUREMENT, Roles.WAREHOUSE), validate(z.object({ sku: text, name: text, description: text.optional(), category: text.optional(), uom: text.optional(), unitPrice: money, standardCost: money, reorderPoint: money.optional() })), InventoryController.createProduct);

router.get('/warehouses', InventoryController.getWarehouses);
router.get('/stock-levels', InventoryController.getStockLevels);
router.get('/stock-movements', InventoryController.getStockMovements);
router.post('/adjust', requireRole(Roles.ADMIN, Roles.WAREHOUSE), validate(z.object({ productId: id, warehouseId: id, quantityDelta: z.number().finite().min(-1e9).max(1e9).refine(n => n !== 0), notes: text.optional() })), InventoryController.adjustStock);

export default router;

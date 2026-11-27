import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/products', InventoryController.getProducts);
router.get('/products/:id', InventoryController.getProductById);
router.post('/products', requireRole(Roles.ADMIN, Roles.PROCUREMENT, Roles.WAREHOUSE), InventoryController.createProduct);

router.get('/warehouses', InventoryController.getWarehouses);
router.get('/stock-levels', InventoryController.getStockLevels);
router.get('/stock-movements', InventoryController.getStockMovements);
router.post('/adjust', requireRole(Roles.ADMIN, Roles.WAREHOUSE), InventoryController.adjustStock);

export default router;

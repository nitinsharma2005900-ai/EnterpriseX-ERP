import { Router } from 'express';
import { ReceiptController } from './receipt.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/goods-receipts', ReceiptController.getGoodsReceipts);
router.get('/goods-receipts/:id', ReceiptController.getGoodsReceiptById);
router.post(
  '/goods-receipts',
  requireRole(Roles.ADMIN, Roles.WAREHOUSE, Roles.PROCUREMENT),
  ReceiptController.createGoodsReceipt
);

export default router;

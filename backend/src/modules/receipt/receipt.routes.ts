import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { ReceiptController } from './receipt.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, enforceScope, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);
router.use(enforceScope({ checkWarehouse: true }));

router.get('/goods-receipts', ReceiptController.getGoodsReceipts);
router.get('/goods-receipts/:id', ReceiptController.getGoodsReceiptById);
router.post(
  '/goods-receipts',
  requireRole(Roles.ADMIN, Roles.WAREHOUSE, Roles.PROCUREMENT),
  validate(z.object({ poId: id, warehouseId: id, carrier: text.optional(), trackingNumber: z.string().max(200).optional(), notes: text.optional(), items: items(z.object({ poItemId: id, productId: id, quantityReceived: positive, quantityAccepted: money, quantityRejected: money.optional(), unitCost: money, batchNumber: text.optional() })) })), ReceiptController.createGoodsReceipt
);

export default router;

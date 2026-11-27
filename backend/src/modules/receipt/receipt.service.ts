import { assert, documentNumber, postJournal } from '../../utils/business';
import { db, transaction } from '../../config/transaction';
import { AppError } from '../../middleware/errorHandler';
import { round } from '../../utils/decimal';
import { recordAuditLog } from '../../middleware/audit';

export class ReceiptService {
  static async getGoodsReceipts(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    return db().goodsReceipt.findMany({
      where,
      include: {
        purchaseOrder: { include: { vendor: true } },
        warehouse: true,
        receivedBy: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: true } },
      },
      orderBy: { receivedDate: 'desc' },
    });
  }

  static async getGoodsReceiptById(id: string) {
    const grn = await db().goodsReceipt.findUnique({
      where: { id },
      include: {
        purchaseOrder: { include: { vendor: true, items: true } },
        warehouse: true,
        receivedBy: { select: { id: true, fullName: true, email: true } },
        items: { include: { product: true } },
      },
    });
    if (!grn) throw new AppError('Goods receipt not found', 404, 'NOT_FOUND');
    return grn;
  }

  /**
   * Assessment 07 & 12: Atomic Goods Receipt posting with inventory increment and PO tracking.
   */
  static async createGoodsReceipt(
    data: {
      poId: string;
      warehouseId: string;
      carrier?: string;
      trackingNumber?: string;
      notes?: string;
      items: Array<{
        poItemId: string;
        productId: string;
        quantityReceived: number;
        quantityAccepted: number;
        quantityRejected?: number;
        unitCost: number;
        batchNumber?: string;
      }>;
    },
    userId: string,
    requestId?: string
  ) {
    return transaction(async (tx) => {
      // 1. Verify PO exists and is approved
      const po = await tx.purchaseOrder.findUnique({
        where: { id: data.poId },
        include: { items: true },
      });

      if (!po) throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');
      if (po.status !== 'APPROVED' && po.status !== 'PARTIALLY_RECEIVED') {
        throw new AppError(
          `Cannot receive goods for PO in status '${po.status}'. PO must be APPROVED.`,
          400,
          'INVALID_PO_STATUS'
        );
      }

      const count = await tx.goodsReceipt.count();
      const grnNumber = documentNumber('GRN');

      const warehouse = await tx.warehouse.findUnique({ where: { id: data.warehouseId } });
      assert(warehouse?.active, 'Warehouse is inactive or outside your scope', 'FORBIDDEN', 403);
      assert(data.items.length > 0 && new Set(data.items.map(i => i.poItemId)).size === data.items.length, 'Receipt must contain unique PO lines');
      for (const item of data.items) {
        const ordered = po.items.find(i => i.id === item.poItemId);
        assert(ordered && ordered.productId === item.productId, 'Receipt line does not belong to this purchase order', 'INVALID_PO_LINE');
        assert(item.quantityReceived > 0 && item.quantityAccepted >= 0 && (item.quantityRejected || 0) >= 0 && round(item.quantityAccepted + (item.quantityRejected || 0)) === round(item.quantityReceived), 'Accepted and rejected quantities must equal received quantity', 'INVALID_QUANTITY');
        assert(round(ordered.quantityReceived + item.quantityAccepted) <= round(ordered.quantityOrdered), 'Receipt exceeds remaining ordered quantity', 'OVER_RECEIPT');
        assert(round(item.unitCost) === round(ordered.unitPrice), 'Receipt cost must match approved PO price', 'COST_MISMATCH');
      }
      // 2. Create Goods Receipt Header
      const grn = await tx.goodsReceipt.create({
        data: {
          grnNumber,
          poId: data.poId,
          warehouseId: data.warehouseId,
          receivedById: userId,
          carrier: data.carrier,
          trackingNumber: data.trackingNumber,
          notes: data.notes,
          status: 'POSTED',
        },
      });

      // 3. Process line items, update PO received quantities, and update inventory
      for (const item of data.items) {
        const qtyReceived = round(Number(item.quantityReceived));
        const qtyAccepted = round(Number(item.quantityAccepted));
        const qtyRejected = round(Number(item.quantityRejected || 0));
        const unitCost = round(Number(item.unitCost));

        // Create GRN item
        await tx.goodsReceiptItem.create({
          data: {
            grnId: grn.id,
            poItemId: item.poItemId,
            productId: item.productId,
            quantityReceived: qtyReceived,
            quantityAccepted: qtyAccepted,
            quantityRejected: qtyRejected,
            unitCost,
            batchNumber: item.batchNumber || `BATCH-${Date.now().toString().slice(-6)}`,
          },
        });

        // Update PO Item quantityReceived
        const poItem = po.items.find((i) => i.id === item.poItemId);
        if (poItem) {
          const newReceivedTotal = round(poItem.quantityReceived + qtyAccepted);
          await tx.purchaseOrderItem.update({
            where: { id: item.poItemId },
            data: { quantityReceived: newReceivedTotal },
          });
        }

        // Update StockLevel in warehouse
        const currentStock = await tx.stockLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: data.warehouseId,
            },
          },
        });

        const averageCost = currentStock && currentStock.quantityOnHand > 0 ? round((currentStock.quantityOnHand * currentStock.averageCost + qtyAccepted * unitCost) / (currentStock.quantityOnHand + qtyAccepted), 6) : unitCost;
        const newOnHand = round((currentStock ? currentStock.quantityOnHand : 0) + qtyAccepted);
        await tx.stockLevel.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: data.warehouseId,
            },
          },
          create: {
            productId: item.productId,
            warehouseId: data.warehouseId,
            quantityOnHand: newOnHand,
            averageCost,
          },
          update: {
            quantityOnHand: newOnHand,
            averageCost,
          },
        });

        // Record Stock Movement
        const smCount = await tx.stockMovement.count();
        await tx.stockMovement.create({
          data: {
            movementNumber: documentNumber('SM-IN'),
            productId: item.productId,
            warehouseId: data.warehouseId,
            type: 'IN_PURCHASE',
            quantity: qtyAccepted,
            unitCost,
            totalCost: round(qtyAccepted * unitCost),
            referenceType: 'GRN',
            referenceId: grn.id,
            batchNumber: item.batchNumber,
            notes: `Goods received against ${po.poNumber}`,
          },
        });
      }

      // 4. Update PO status (COMPLETED if all items fully received, else PARTIALLY_RECEIVED)
      const updatedPo = await tx.purchaseOrder.findUnique({
        where: { id: data.poId },
        include: { items: true },
      });

      const allReceived = updatedPo?.items.every((i) => i.quantityReceived >= i.quantityOrdered);
      await tx.purchaseOrder.update({
        where: { id: data.poId },
        data: {
          status: allReceived ? 'COMPLETED' : 'PARTIALLY_RECEIVED',
        },
      });

      const receiptValue = round(data.items.reduce((sum, i) => sum + i.quantityAccepted * i.unitCost, 0));
      if (receiptValue) await postJournal('GRN', grn.id, `Inventory received against ${po.poNumber}`, userId, [
        { code: '1400', debit: receiptValue, credit: 0 }, { code: '2020', debit: 0, credit: receiptValue },
      ]);
      await recordAuditLog({
        userId,
        action: 'POST',
        entityType: 'GRN',
        entityId: grn.id,
        afterState: { grnNumber: grn.grnNumber, poId: data.poId, status: 'POSTED' },
        requestId,
      });

      return tx.goodsReceipt.findUnique({
        where: { id: grn.id },
        include: { items: { include: { product: true } }, purchaseOrder: true, warehouse: true },
      });
    });
  }
}

import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { round } from '../../utils/decimal';
import { recordAuditLog } from '../../middleware/audit';

export class ReceiptService {
  static async getGoodsReceipts(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    return prisma.goodsReceipt.findMany({
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
    const grn = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        purchaseOrder: { include: { vendor: true, items: true } },
        warehouse: true,
        receivedBy: true,
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
    return prisma.$transaction(async (tx) => {
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
      const grnNumber = `GRN-2026-${String(count + 1).padStart(4, '0')}`;

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
            averageCost: unitCost,
          },
          update: {
            quantityOnHand: newOnHand,
            averageCost: unitCost,
          },
        });

        // Record Stock Movement
        const smCount = await tx.stockMovement.count();
        await tx.stockMovement.create({
          data: {
            movementNumber: `SM-IN-${String(smCount + 1).padStart(5, '0')}`,
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
    }, { timeout: 15000, maxWait: 10000 });
  }
}

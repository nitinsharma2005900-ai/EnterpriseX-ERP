import { assert, documentNumber, postJournal } from '../../utils/business';
import { recordAuditLog } from '../../middleware/audit';
import { db, transaction } from '../../config/transaction';
import { AppError } from '../../middleware/errorHandler';
import { round } from '../../utils/decimal';

export class InventoryService {
  static async getProducts() {
    return db().product.findMany({
      include: {
        stockLevels: { include: { warehouse: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getProductById(id: string) {
    const product = await db().product.findUnique({
      where: { id },
      include: {
        stockLevels: { include: { warehouse: true } },
        stockMovements: { orderBy: { date: 'desc' }, take: 20 },
      },
    });
    if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
    return product;
  }

  static async createProduct(data: {
    sku: string;
    name: string;
    description?: string;
    category?: string;
    uom?: string;
    unitPrice: number;
    standardCost: number;
    reorderPoint?: number;
  }) {
    const existing = await db().product.findUnique({ where: { sku: data.sku } });
    if (existing) throw new AppError(`Product SKU ${data.sku} already exists`, 409, 'PRODUCT_EXISTS');

    return db().product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        category: data.category || 'HARDWARE',
        uom: data.uom || 'PCS',
        unitPrice: round(Number(data.unitPrice || 0)),
        standardCost: round(Number(data.standardCost || 0)),
        reorderPoint: round(Number(data.reorderPoint || 10)),
      },
    });
  }

  static async getWarehouses() {
    return db().warehouse.findMany({
      include: {
        branch: { include: { organization: true } },
        _count: { select: { stockLevels: true, stockMovements: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getStockLevels(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    return db().stockLevel.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  static async getStockMovements(productId?: string, warehouseId?: string) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;

    return db().stockMovement.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  /**
   * Adjust stock level directly (e.g. physical count cycle)
   */
  static async adjustStock(data: {
    productId: string;
    warehouseId: string;
    quantityDelta: number;
    notes?: string;
    userId: string;
  }) {
    return transaction(async (tx) => {
      const currentLevel = await tx.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: data.productId,
            warehouseId: data.warehouseId,
          },
        },
      });

      const currentQty = currentLevel ? currentLevel.quantityOnHand : 0;
      const newQty = round(currentQty + data.quantityDelta);

      if (newQty < (currentLevel?.quantityReserved || 0)) {
        throw new AppError(
          `Negative stock prohibited. Current: ${currentQty}, Adjustment: ${data.quantityDelta}, Result: ${newQty}`,
          400,
          'NEGATIVE_STOCK'
        );
      }

      const product = await tx.product.findUnique({ where: { id: data.productId } });
      assert(product?.active && await tx.warehouse.findUnique({ where: { id: data.warehouseId } }), 'Active product or authorized warehouse not found', 'NOT_FOUND', 404);
      const unitCost = currentLevel?.averageCost || product.standardCost;

      // Update or create StockLevel
      const updatedLevel = await tx.stockLevel.upsert({
        where: {
          productId_warehouseId: {
            productId: data.productId,
            warehouseId: data.warehouseId,
          },
        },
        create: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantityOnHand: newQty,
          averageCost: unitCost,
        },
        update: {
          quantityOnHand: newQty,
        },
      });

      // Record Stock Movement
      const count = await tx.stockMovement.count();
      const movementNumber = documentNumber('SM-ADJ');

      await tx.stockMovement.create({
        data: {
          movementNumber,
          productId: data.productId,
          warehouseId: data.warehouseId,
          type: 'ADJUSTMENT',
          quantity: data.quantityDelta,
          unitCost,
          totalCost: round(Math.abs(data.quantityDelta) * unitCost),
          notes: data.notes || 'Manual stock adjustment',
        },
      });

      const value = round(Math.abs(data.quantityDelta) * unitCost);
      if (value) await postJournal('ADJUSTMENT', movementNumber, data.notes || 'Physical stock adjustment', data.userId, data.quantityDelta > 0 ? [{ code: '1400', debit: value, credit: 0 }, { code: '6010', debit: 0, credit: value }] : [{ code: '6010', debit: value, credit: 0 }, { code: '1400', debit: 0, credit: value }]);
      await recordAuditLog({ userId: data.userId, action: 'UPDATE', entityType: 'STOCK', entityId: updatedLevel.id, beforeState: { quantity: currentQty }, afterState: { quantity: newQty } });
      return updatedLevel;
    });
  }
}

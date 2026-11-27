import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { round } from '../../utils/decimal';

export class InventoryService {
  static async getProducts() {
    return prisma.product.findMany({
      include: {
        stockLevels: { include: { warehouse: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
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
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw new AppError(`Product SKU ${data.sku} already exists`, 409, 'PRODUCT_EXISTS');

    return prisma.product.create({
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
    return prisma.warehouse.findMany({
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

    return prisma.stockLevel.findMany({
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

    return prisma.stockMovement.findMany({
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
    return prisma.$transaction(async (tx) => {
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

      if (newQty < 0) {
        throw new AppError(
          `Negative stock prohibited. Current: ${currentQty}, Adjustment: ${data.quantityDelta}, Result: ${newQty}`,
          400,
          'NEGATIVE_STOCK'
        );
      }

      const product = await tx.product.findUnique({ where: { id: data.productId } });
      const unitCost = product ? product.standardCost : 0;

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
      const movementNumber = `SM-ADJ-${String(count + 1).padStart(5, '0')}`;

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

      return updatedLevel;
    });
  }
}

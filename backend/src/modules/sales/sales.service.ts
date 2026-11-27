import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { round } from '../../utils/decimal';
import { recordAuditLog } from '../../middleware/audit';

export class SalesService {
  static async getSalesOrders(customerId?: string) {
    const where: any = {};
    if (customerId) where.customerId = customerId;

    return prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getSalesOrderById(id: string) {
    const so = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
        invoices: { include: { payments: true } },
      },
    });
    if (!so) throw new AppError('Sales order not found', 404, 'NOT_FOUND');
    return so;
  }

  static async createSalesOrder(
    data: {
      customerId: string;
      shippingAddress?: string;
      expectedShipDate?: Date;
      items: Array<{
        productId: string;
        quantityOrdered: number;
        unitPrice: number;
        taxRate?: number;
      }>;
    },
    userId: string,
    requestId?: string
  ) {
    if (!data.items || data.items.length === 0) {
      throw new AppError('Sales order must contain at least one line item', 400, 'NO_ITEMS');
    }

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
    if (customer.status !== 'ACTIVE') throw new AppError('Customer is suspended or inactive', 400, 'CUSTOMER_INACTIVE');

    let netAmount = 0;
    let taxAmount = 0;

    const lineItemsData = data.items.map((item) => {
      const qty = round(Number(item.quantityOrdered));
      const price = round(Number(item.unitPrice));
      const rate = item.taxRate !== undefined ? Number(item.taxRate) : 0.10;
      const sub = round(qty * price);
      const tax = round(sub * rate);
      const tot = round(sub + tax);

      netAmount = round(netAmount + sub);
      taxAmount = round(taxAmount + tax);

      return {
        productId: item.productId,
        quantityOrdered: qty,
        unitPrice: price,
        taxRate: rate,
        totalAmount: tot,
      };
    });

    const totalAmount = round(netAmount + taxAmount);

    // Credit limit check
    if (customer.outstandingBalance + totalAmount > customer.creditLimit) {
      throw new AppError(
        `Order exceeds customer credit limit. Credit limit: $${customer.creditLimit}, current balance: $${customer.outstandingBalance}, order amount: $${totalAmount}`,
        400,
        'CREDIT_LIMIT_EXCEEDED'
      );
    }

    const count = await prisma.salesOrder.count();
    const soNumber = `SO-2026-${String(count + 1).padStart(4, '0')}`;

    const so = await prisma.salesOrder.create({
      data: {
        soNumber,
        customerId: data.customerId,
        netAmount,
        taxAmount,
        totalAmount,
        status: 'CONFIRMED',
        shippingAddress: data.shippingAddress || customer.address,
        expectedShipDate: data.expectedShipDate,
        items: {
          create: lineItemsData,
        },
      },
      include: { customer: true, items: { include: { product: true } } },
    });

    await recordAuditLog({
      userId,
      action: 'CREATE',
      entityType: 'PO', // or SO
      entityId: so.id,
      afterState: { soNumber: so.soNumber, totalAmount, status: so.status },
      requestId,
    });

    return so;
  }

  /**
   * Assessment 07 & 12: Stock Reservation for Order-to-Cash workflow
   */
  static async reserveStock(soId: string, warehouseId: string, userId: string, requestId?: string) {
    return prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.findUnique({
        where: { id: soId },
        include: { items: true },
      });
      if (!so) throw new AppError('Sales order not found', 404, 'NOT_FOUND');
      if (so.status !== 'CONFIRMED') {
        throw new AppError(`Cannot reserve stock for order in status '${so.status}'`, 400, 'INVALID_STATUS');
      }

      for (const item of so.items) {
        const stock = await tx.stockLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId,
            },
          },
        });

        const available = stock ? stock.quantityOnHand - stock.quantityReserved : 0;
        if (available < item.quantityOrdered) {
          throw new AppError(
            `Insufficient stock to reserve. Product ID: ${item.productId}. Available: ${available}, Required: ${item.quantityOrdered}`,
            400,
            'INSUFFICIENT_STOCK'
          );
        }

        await tx.stockLevel.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId,
            },
          },
          data: {
            quantityReserved: round(stock!.quantityReserved + item.quantityOrdered),
          },
        });
      }

      const updated = await tx.salesOrder.update({
        where: { id: soId },
        data: { status: 'RESERVED' },
        include: { items: { include: { product: true } }, customer: true },
      });

      await recordAuditLog({
        userId,
        action: 'UPDATE',
        entityType: 'STOCK',
        entityId: so.id,
        afterState: { soNumber: so.soNumber, status: 'RESERVED', warehouseId },
        requestId,
      });

      return updated;
    });
  }

  /**
   * Assessment 07 & 12: Fulfill Sales Order and deduct stock
   */
  static async fulfillSalesOrder(soId: string, warehouseId: string, userId: string, requestId?: string) {
    return prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.findUnique({
        where: { id: soId },
        include: { items: true },
      });
      if (!so) throw new AppError('Sales order not found', 404, 'NOT_FOUND');
      if (so.status !== 'RESERVED' && so.status !== 'CONFIRMED') {
        throw new AppError(`Order must be RESERVED or CONFIRMED before fulfillment. Status: ${so.status}`, 400, 'INVALID_STATUS');
      }

      for (const item of so.items) {
        const stock = await tx.stockLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId,
            },
          },
        });

        const currentOnHand = stock ? stock.quantityOnHand : 0;
        const currentReserved = stock ? stock.quantityReserved : 0;

        if (currentOnHand < item.quantityOrdered) {
          throw new AppError(`Negative stock prohibited on fulfillment. Available on hand: ${currentOnHand}`, 400, 'NEGATIVE_STOCK');
        }

        const newOnHand = round(currentOnHand - item.quantityOrdered);
        const newReserved = round(Math.max(0, currentReserved - item.quantityOrdered));

        await tx.stockLevel.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId,
            },
          },
          data: {
            quantityOnHand: newOnHand,
            quantityReserved: newReserved,
          },
        });

        const smCount = await tx.stockMovement.count();
        await tx.stockMovement.create({
          data: {
            movementNumber: `SM-OUT-${String(smCount + 1).padStart(5, '0')}`,
            productId: item.productId,
            warehouseId,
            type: 'OUT_SALE',
            quantity: -item.quantityOrdered,
            unitCost: stock ? stock.averageCost : 0,
            totalCost: round(item.quantityOrdered * (stock ? stock.averageCost : 0)),
            referenceType: 'SO',
            referenceId: so.id,
            notes: `Fulfillment of ${so.soNumber}`,
          },
        });

        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: { quantityFulfilled: item.quantityOrdered },
        });
      }

      const updated = await tx.salesOrder.update({
        where: { id: soId },
        data: { status: 'FULFILLED' },
        include: { customer: true, items: true },
      });

      await recordAuditLog({
        userId,
        action: 'UPDATE',
        entityType: 'STOCK',
        entityId: so.id,
        afterState: { soNumber: so.soNumber, status: 'FULFILLED' },
        requestId,
      });

      return updated;
    });
  }
}

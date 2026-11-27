import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { round } from '../../utils/decimal';
import { recordAuditLog } from '../../middleware/audit';

export class ProcurementService {
  static async getPurchaseOrders(query?: { status?: string; vendorId?: string; departmentId?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.vendorId) where.vendorId = query.vendorId;
    if (query?.departmentId) where.departmentId = query.departmentId;

    return prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: true,
        department: true,
        requestedBy: { select: { id: true, fullName: true, email: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, email: true, role: true } },
        items: { include: { product: true } },
        goodsReceipts: true,
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getPurchaseOrderById(id: string) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        department: true,
        requestedBy: true,
        approvedBy: true,
        items: { include: { product: true } },
        goodsReceipts: { include: { items: true, receivedBy: true } },
        invoices: { include: { payments: true } },
      },
    });
    if (!po) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');
    return po;
  }

  static async createPurchaseOrder(
    data: {
      vendorId: string;
      departmentId: string;
      expectedDeliveryDate?: Date;
      terms?: string;
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
      throw new AppError('Purchase order must contain at least one line item', 400, 'NO_ITEMS');
    }

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
        subtotal: sub,
        totalAmount: tot,
      };
    });

    const totalAmount = round(netAmount + taxAmount);
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-2026-${String(count + 1).padStart(4, '0')}`;
    const departmentId = data.departmentId || (await prisma.department.findFirst())?.id || '';

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: data.vendorId,
        departmentId,
        requestedById: userId,
        status: 'PENDING_APPROVAL',
        netAmount,
        taxAmount,
        totalAmount,
        currency: 'USD',
        expectedDeliveryDate: data.expectedDeliveryDate,
        terms: data.terms || 'Standard Procurement Terms (Net 30)',
        items: {
          create: lineItemsData,
        },
      },
      include: { items: { include: { product: true } }, vendor: true, department: true },
    });

    // Create approval request record
    await prisma.approvalRequest.create({
      data: {
        documentType: 'PO',
        documentId: po.id,
        requesterId: userId,
        requestedAmount: totalAmount,
        status: 'PENDING',
      },
    });

    await recordAuditLog({
      userId,
      action: 'CREATE',
      entityType: 'PO',
      entityId: po.id,
      afterState: { poNumber: po.poNumber, totalAmount, status: po.status },
      requestId,
    });

    return po;
  }

  static async approvePurchaseOrder(
    poId: string,
    user: { id: string; role: string; approvalLimit: number },
    comments?: string,
    requestId?: string
  ) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');

    if (po.status !== 'PENDING_APPROVAL' && po.status !== 'DRAFT') {
      throw new AppError(`Cannot approve PO in status '${po.status}'`, 400, 'INVALID_STATUS');
    }

    // Role check and approval limit enforcement (Assessment 04)
    if (user.role !== 'ERP_ADMINISTRATOR' && user.role !== 'FINANCE_OFFICER' && user.role !== 'DEPARTMENT_MANAGER') {
      throw new AppError('Only department managers, finance officers, or admins can approve POs', 403, 'FORBIDDEN');
    }

    if (user.role !== 'ERP_ADMINISTRATOR' && user.approvalLimit > 0 && po.totalAmount > user.approvalLimit) {
      throw new AppError(
        `Approval limit exceeded. PO total ($${po.totalAmount.toFixed(2)}) exceeds your authorization limit ($${user.approvalLimit.toFixed(2)}). Escalation required.`,
        403,
        'APPROVAL_LIMIT_EXCEEDED'
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'APPROVED',
        approvedById: user.id,
        approvalNotes: comments || 'Approved via standard authorization workflow',
      },
      include: { vendor: true, items: true },
    });

    await prisma.approvalRequest.updateMany({
      where: { documentId: poId, status: 'PENDING' },
      data: {
        approverId: user.id,
        status: 'APPROVED',
        comments: comments || 'Approved',
        respondedAt: new Date(),
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'APPROVE',
      entityType: 'PO',
      entityId: po.id,
      afterState: { status: 'APPROVED', approverId: user.id },
      requestId,
    });

    return updated;
  }

  static async rejectPurchaseOrder(poId: string, userId: string, comments: string, requestId?: string) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'REJECTED',
        approvalNotes: comments,
      },
    });

    await prisma.approvalRequest.updateMany({
      where: { documentId: poId, status: 'PENDING' },
      data: {
        approverId: userId,
        status: 'REJECTED',
        comments,
        respondedAt: new Date(),
      },
    });

    await recordAuditLog({
      userId,
      action: 'REJECT',
      entityType: 'PO',
      entityId: po.id,
      afterState: { status: 'REJECTED', comments },
      requestId,
    });

    return updated;
  }
}

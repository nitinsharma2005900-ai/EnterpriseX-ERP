import { db, transaction } from '../../config/transaction';
import { round } from '../../utils/decimal';
import { documentNumber, assert, postJournal } from '../../utils/business';
import { recordAuditLog } from '../../middleware/audit';

export class BillingService {
  static getInvoices(type?: string, status?: string) {
    return db().invoice.findMany({ where: { ...(type ? { type } : {}), ...(status ? { status } : {}) },
      include: { vendor: true, customer: true, purchaseOrder: true, salesOrder: true, goodsReceipt: true, payments: true, items: true }, orderBy: { issueDate: 'desc' } });
  }
  static async getInvoiceById(id: string) {
    const invoice = await db().invoice.findUnique({ where: { id }, include: { vendor: true, customer: true, purchaseOrder: { include: { items: true } }, salesOrder: { include: { items: true } }, goodsReceipt: { include: { items: true } }, payments: true, items: { include: { product: true } } } });
    assert(invoice, 'Invoice not found', 'NOT_FOUND', 404);
    return invoice;
  }
  static async createAPInvoice(data: { poId: string; grnId?: string; invoiceNumber?: string; dueDate?: Date; items: Array<{ productId?: string; description: string; quantity: number; unitPrice: number; taxRate?: number }> }, userId: string, requestId?: string) {
    return transaction(async tx => {
      const po = await tx.purchaseOrder.findUnique({ where: { id: data.poId }, include: { items: true, vendor: true, goodsReceipts: { include: { items: true } } } });
      assert(po, 'Purchase order not found', 'PO_NOT_FOUND', 404);
      const existing = await tx.invoice.findFirst({ where: { poId: po.id, type: 'ACCOUNTS_PAYABLE', status: { not: 'VOIDED' } } });
      assert(!existing, 'An active invoice already exists for this purchase order', 'DUPLICATE_INVOICE', 409);
      assert(po.status === 'COMPLETED', 'All purchase order goods must be received before invoicing', 'RECEIPT_REQUIRED');
      const receipt = data.grnId ? po.goodsReceipts.find(g => g.id === data.grnId) : po.goodsReceipts[0];
      assert(receipt, 'Receipt must belong to this purchase order', 'INVALID_RECEIPT');
      assert(data.items.length === po.items.length && new Set(data.items.map(i => i.productId)).size === data.items.length, 'Invoice lines must match every PO line once', 'THREE_WAY_MISMATCH');
      for (const item of data.items) {
        const ordered = po.items.find(i => i.productId === item.productId);
        const received = po.goodsReceipts.filter(g => g.status === 'POSTED').flatMap(g => g.items).filter(i => i.productId === item.productId).reduce((s, i) => s + i.quantityAccepted, 0);
        assert(ordered && round(item.quantity) === round(ordered.quantityOrdered) && round(received) >= round(item.quantity) && round(item.unitPrice) === round(ordered.unitPrice) && (item.taxRate ?? ordered.taxRate) === ordered.taxRate, 'Invoice quantity, price or tax does not match PO and accepted receipts', 'THREE_WAY_MISMATCH');
      }
      const invoice = await tx.invoice.create({ data: {
        invoiceNumber: data.invoiceNumber || documentNumber('INV-AP'), type: 'ACCOUNTS_PAYABLE', vendorId: po.vendorId, poId: po.id, grnId: receipt.id,
        subtotal: po.netAmount, taxAmount: po.taxAmount, totalAmount: po.totalAmount, remainingAmount: po.totalAmount,
        dueDate: data.dueDate || new Date(Date.now() + 30 * 86400000), matchStatus: 'MATCHED',
        items: { create: data.items.map(i => ({ ...i, taxRate: po.items.find(p => p.productId === i.productId)!.taxRate, amount: po.items.find(p => p.productId === i.productId)!.totalAmount })) },
      }, include: { vendor: true, items: true, purchaseOrder: true } });
      await tx.vendor.update({ where: { id: po.vendorId }, data: { balance: { increment: po.totalAmount } } });
      await postJournal('INVOICE', invoice.id, `Vendor invoice ${invoice.invoiceNumber}`, userId, [
        { code: '2020', debit: po.netAmount, credit: 0 }, { code: '1300', debit: po.taxAmount, credit: 0 }, { code: '2010', debit: 0, credit: po.totalAmount },
      ]);
      await recordAuditLog({ userId, action: 'CREATE', entityType: 'INVOICE', entityId: invoice.id, afterState: { totalAmount: invoice.totalAmount, matchStatus: 'MATCHED' }, requestId });
      return invoice;
    });
  }
  static async createARInvoice(soId: string, userId: string, requestId?: string) {
    return transaction(async tx => {
      const so = await tx.salesOrder.findUnique({ where: { id: soId }, include: { items: { include: { product: true } }, customer: true } });
      assert(so, 'Sales order not found', 'SO_NOT_FOUND', 404);
      const existing = await tx.invoice.findFirst({ where: { soId } });
      assert(!existing, 'Invoice already created for this sales order', 'DUPLICATE_INVOICE', 409);
      assert(so.status === 'FULFILLED', 'Sales order must be fulfilled before invoicing', 'INVALID_STATUS');
      assert(so.customer.outstandingBalance + so.totalAmount <= so.customer.creditLimit, 'Customer credit limit exceeded', 'CREDIT_LIMIT_EXCEEDED');
      const invoice = await tx.invoice.create({ data: {
        invoiceNumber: documentNumber('INV-AR'), type: 'ACCOUNTS_RECEIVABLE', customerId: so.customerId, soId, subtotal: so.netAmount, taxAmount: so.taxAmount,
        totalAmount: so.totalAmount, remainingAmount: so.totalAmount, dueDate: new Date(Date.now() + 30 * 86400000),
        items: { create: so.items.map(i => ({ productId: i.productId, description: i.product.name, quantity: i.quantityOrdered, unitPrice: i.unitPrice, taxRate: i.taxRate, amount: i.totalAmount })) },
      }, include: { customer: true, items: true } });
      await tx.customer.update({ where: { id: so.customerId }, data: { outstandingBalance: { increment: so.totalAmount } } });
      await tx.salesOrder.update({ where: { id: soId }, data: { status: 'INVOICED' } });
      await postJournal('INVOICE', invoice.id, `Customer invoice ${invoice.invoiceNumber}`, userId, [
        { code: '1200', debit: so.totalAmount, credit: 0 }, { code: '4010', debit: 0, credit: so.netAmount }, { code: '2030', debit: 0, credit: so.taxAmount },
      ]);
      await recordAuditLog({ userId, action: 'CREATE', entityType: 'INVOICE', entityId: invoice.id, afterState: { totalAmount: invoice.totalAmount }, requestId });
      return invoice;
    });
  }
  static async recordPayment(data: { invoiceId: string; amount: number; paymentMethod?: string; referenceNumber?: string; idempotencyKey: string; notes?: string }, userId: string, requestId?: string) {
    return transaction(async tx => {
      const existing = await tx.payment.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
      if (existing) {
        assert(existing.invoiceId === data.invoiceId && existing.amount === round(data.amount) && existing.paymentMethod === (data.paymentMethod || 'BANK_TRANSFER'), 'Idempotency key was used with a different payment', 'IDEMPOTENCY_CONFLICT', 409);
        return { payment: existing, isDuplicateSuppressed: true, message: 'Existing settlement returned' };
      }
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      assert(invoice, 'Invoice not found', 'INVOICE_NOT_FOUND', 404);
      assert(['ISSUED','PARTIALLY_PAID'].includes(invoice.status) && invoice.matchStatus === 'MATCHED', 'Invoice is not eligible for settlement', 'INVALID_STATUS');
      const amount = round(data.amount);
      assert(Number.isFinite(amount) && amount > 0, 'Payment must be greater than zero', 'INVALID_AMOUNT');
      assert(amount <= round(invoice.remainingAmount), 'Payment exceeds remaining invoice balance', 'OVERPAYMENT');
      const payment = await tx.payment.create({ data: { ...data, amount, paymentNumber: documentNumber('PAY'), paymentMethod: data.paymentMethod || 'BANK_TRANSFER' } });
      const remainingAmount = round(invoice.remainingAmount - amount);
      await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount: { increment: amount }, remainingAmount, status: remainingAmount === 0 ? 'PAID' : 'PARTIALLY_PAID' } });
      const ap = invoice.type === 'ACCOUNTS_PAYABLE';
      if (ap) await tx.vendor.update({ where: { id: invoice.vendorId! }, data: { balance: { decrement: amount } } });
      else await tx.customer.update({ where: { id: invoice.customerId! }, data: { outstandingBalance: { decrement: amount } } });
      await postJournal('PAYMENT', payment.id, `Settlement of ${invoice.invoiceNumber}`, userId, ap ? [
        { code: '2010', debit: amount, credit: 0 }, { code: '1010', debit: 0, credit: amount },
      ] : [{ code: '1010', debit: amount, credit: 0 }, { code: '1200', debit: 0, credit: amount }]);
      await recordAuditLog({ userId, action: 'CREATE', entityType: 'PAYMENT', entityId: payment.id, afterState: { amount, invoiceId: invoice.id }, requestId });
      return { payment, isDuplicateSuppressed: false, message: 'Payment and journal posted' };
    });
  }
}

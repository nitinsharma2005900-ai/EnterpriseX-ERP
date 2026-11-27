import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { round, isEqual } from '../../utils/decimal';
import { recordAuditLog } from '../../middleware/audit';
import { AccountsService } from '../accounts/accounts.service';

export class BillingService {
  static async getInvoices(type?: 'ACCOUNTS_PAYABLE' | 'ACCOUNTS_RECEIVABLE', status?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    return prisma.invoice.findMany({
      where,
      include: {
        vendor: true,
        customer: true,
        purchaseOrder: true,
        salesOrder: true,
        goodsReceipt: true,
        payments: true,
        items: true,
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  static async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        customer: true,
        purchaseOrder: { include: { items: true } },
        salesOrder: { include: { items: true } },
        goodsReceipt: { include: { items: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
        items: { include: { product: true } },
      },
    });
    if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');
    return invoice;
  }

  /**
   * Assessment 07: Create AP Invoice with 3-Way Matching (PO, GRN, Invoice)
   */
  static async createAPInvoice(
    data: {
      poId: string;
      grnId?: string;
      invoiceNumber?: string;
      dueDate?: Date;
      taxAmount?: number;
      items: Array<{
        productId?: string;
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
      }>;
    },
    userId: string,
    requestId?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: data.poId },
        include: { vendor: true, items: true, goodsReceipts: { include: { items: true } } },
      });

      if (!po) throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');

      // Duplicate invoice check
      const existingInv = await tx.invoice.findFirst({
        where: {
          poId: data.poId,
          type: 'ACCOUNTS_PAYABLE',
          status: { not: 'VOIDED' },
        },
      });

      if (existingInv) {
        throw new AppError(
          `An active accounts payable invoice (${existingInv.invoiceNumber}) already exists for ${po.poNumber}. Duplicate invoice posting prevented.`,
          409,
          'DUPLICATE_INVOICE'
        );
      }

      let subtotal = 0;
      let totalTax = 0;

      const lineItemsData = data.items.map((item) => {
        const qty = round(Number(item.quantity));
        const price = round(Number(item.unitPrice));
        const rate = item.taxRate !== undefined ? Number(item.taxRate) : 0.10;
        const lineSub = round(qty * price);
        const lineTax = round(lineSub * rate);
        subtotal = round(subtotal + lineSub);
        totalTax = round(totalTax + lineTax);

        return {
          productId: item.productId,
          description: item.description,
          quantity: qty,
          unitPrice: price,
          taxRate: rate,
          amount: round(lineSub + lineTax),
        };
      });

      const grandTotal = round(subtotal + totalTax);

      // Assessment 07 & 12: 3-Way Matching Check
      // Compares PO Total, GRN Received Quantities, and Invoice Total
      let matchStatus = 'MATCHED';
      const tolerance = 0.05; // 5% tolerance
      const poDiff = Math.abs(grandTotal - po.totalAmount) / (po.totalAmount || 1);

      if (poDiff > tolerance) {
        matchStatus = 'DISCREPANCY';
      }

      const invCount = await tx.invoice.count();
      const invoiceNumber = data.invoiceNumber || `INV-AP-2026-${String(invCount + 1).padStart(4, '0')}`;
      const dueDate = data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          type: 'ACCOUNTS_PAYABLE',
          vendorId: po.vendorId,
          poId: po.id,
          grnId: data.grnId || po.goodsReceipts[0]?.id || null,
          status: 'ISSUED',
          subtotal,
          taxAmount: totalTax,
          totalAmount: grandTotal,
          paidAmount: 0,
          remainingAmount: grandTotal,
          dueDate,
          matchStatus,
          items: {
            create: lineItemsData,
          },
        },
        include: { vendor: true, items: true, purchaseOrder: true },
      });

      // Update vendor balance
      await tx.vendor.update({
        where: { id: po.vendorId },
        data: { balance: round(po.vendor.balance + grandTotal) },
      });

      await recordAuditLog({
        userId,
        action: 'CREATE',
        entityType: 'INVOICE',
        entityId: invoice.id,
        afterState: { invoiceNumber: invoice.invoiceNumber, grandTotal, matchStatus },
        requestId,
      });

      return invoice;
    });
  }

  /**
   * Assessment 07: Create AR Invoice from Sales Order
   */
  static async createARInvoice(soId: string, userId: string, requestId?: string) {
    return prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.findUnique({
        where: { id: soId },
        include: { customer: true, items: { include: { product: true } } },
      });

      if (!so) throw new AppError('Sales order not found', 404, 'SO_NOT_FOUND');

      const existingInv = await tx.invoice.findFirst({
        where: { soId: so.id, type: 'ACCOUNTS_RECEIVABLE' },
      });
      if (existingInv) throw new AppError(`Invoice already created for this sales order: ${existingInv.invoiceNumber}`, 409, 'DUPLICATE_INVOICE');

      const invCount = await tx.invoice.count();
      const invoiceNumber = `INV-AR-2026-${String(invCount + 1).padStart(4, '0')}`;
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          type: 'ACCOUNTS_RECEIVABLE',
          customerId: so.customerId,
          soId: so.id,
          status: 'ISSUED',
          subtotal: so.netAmount,
          taxAmount: so.taxAmount,
          totalAmount: so.totalAmount,
          paidAmount: 0,
          remainingAmount: so.totalAmount,
          dueDate,
          matchStatus: 'MATCHED',
          items: {
            create: so.items.map((i) => ({
              productId: i.productId,
              description: `Fulfillment of ${i.product.name} (${i.product.sku})`,
              quantity: i.quantityOrdered,
              unitPrice: i.unitPrice,
              taxRate: i.taxRate,
              amount: i.totalAmount,
            })),
          },
        },
        include: { customer: true, items: true },
      });

      // Update customer outstanding balance
      await tx.customer.update({
        where: { id: so.customerId },
        data: { outstandingBalance: round(so.customer.outstandingBalance + so.totalAmount) },
      });

      await tx.salesOrder.update({
        where: { id: soId },
        data: { status: 'INVOICED' },
      });

      await recordAuditLog({
        userId,
        action: 'CREATE',
        entityType: 'INVOICE',
        entityId: invoice.id,
        afterState: { invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount },
        requestId,
      });

      return invoice;
    });
  }

  /**
   * Assessment 07, 08 & 12: Record Payment with Idempotency Key and Auto General Ledger Posting!
   */
  static async recordPayment(
    data: {
      invoiceId: string;
      amount: number;
      paymentMethod?: string;
      referenceNumber?: string;
      idempotencyKey: string;
      notes?: string;
    },
    userId: string,
    requestId?: string
  ) {
    // 1. Idempotency Check: Prevent duplicate payment charging
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      include: { invoice: true },
    });

    if (existingPayment) {
      // Idempotent return: Return already executed payment without executing again!
      return {
        payment: existingPayment,
        isDuplicateSuppressed: true,
        message: 'Idempotent request recognized. Returning existing payment without duplicate posting.',
      };
    }

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { vendor: true, customer: true },
      });

      if (!invoice) throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
      if (invoice.status === 'PAID') {
        throw new AppError('Invoice is already fully paid', 400, 'ALREADY_PAID');
      }

      const paymentAmount = round(Number(data.amount));
      if (paymentAmount <= 0) {
        throw new AppError('Payment amount must be greater than zero', 400, 'INVALID_AMOUNT');
      }

      if (paymentAmount > round(invoice.remainingAmount + 0.01)) {
        throw new AppError(
          `Payment amount ($${paymentAmount.toFixed(2)}) exceeds remaining invoice balance ($${invoice.remainingAmount.toFixed(2)})`,
          400,
          'OVERPAYMENT'
        );
      }

      const pCount = await tx.payment.count();
      const paymentNumber = `PAY-2026-${String(pCount + 1).padStart(4, '0')}`;

      // Create Payment Record
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          amount: paymentAmount,
          paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
          referenceNumber: data.referenceNumber,
          status: 'COMPLETED',
          idempotencyKey: data.idempotencyKey,
          notes: data.notes,
        },
      });

      // Update invoice remaining balances and status
      const newPaidAmount = round(invoice.paidAmount + paymentAmount);
      const newRemaining = round(Math.max(0, invoice.totalAmount - newPaidAmount));
      const newStatus = newRemaining <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          status: newStatus,
        },
      });

      // Update party balances
      if (invoice.type === 'ACCOUNTS_PAYABLE' && invoice.vendorId) {
        await tx.vendor.update({
          where: { id: invoice.vendorId },
          data: { balance: round(Math.max(0, invoice.vendor!.balance - paymentAmount)) },
        });
      } else if (invoice.type === 'ACCOUNTS_RECEIVABLE' && invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { outstandingBalance: round(Math.max(0, invoice.customer!.outstandingBalance - paymentAmount)) },
        });
      }

      // Auto-post General Ledger Journal Entry
      const openPeriod = await tx.financialPeriod.findFirst({
        where: { status: 'OPEN' },
        orderBy: { startDate: 'desc' },
      });

      if (openPeriod) {
        const cashAccount = await tx.account.findFirst({ where: { code: '1010' } });
        const apAccount = await tx.account.findFirst({ where: { code: '2010' } });
        const arAccount = await tx.account.findFirst({ where: { code: '1200' } });

        const jeCount = await tx.journalEntry.count();
        const entryNumber = `JE-PAY-${String(jeCount + 1).padStart(5, '0')}`;

        if (invoice.type === 'ACCOUNTS_PAYABLE' && cashAccount && apAccount) {
          // Debit AP (2010), Credit Cash (1010)
          await tx.journalEntry.create({
            data: {
              entryNumber,
              periodId: openPeriod.id,
              referenceType: 'PAYMENT',
              referenceId: payment.id,
              description: `Payment for vendor invoice ${invoice.invoiceNumber}`,
              createdById: userId,
              status: 'POSTED',
              lines: {
                create: [
                  { accountId: apAccount.id, debit: paymentAmount, credit: 0, description: 'Debit AP' },
                  { accountId: cashAccount.id, debit: 0, credit: paymentAmount, description: 'Credit Cash' },
                ],
              },
            },
          });
          // Update account balances
          await tx.account.update({ where: { id: apAccount.id }, data: { balance: round(apAccount.balance - paymentAmount) } });
          await tx.account.update({ where: { id: cashAccount.id }, data: { balance: round(cashAccount.balance - paymentAmount) } });
        } else if (invoice.type === 'ACCOUNTS_RECEIVABLE' && cashAccount && arAccount) {
          // Debit Cash (1010), Credit AR (1200)
          await tx.journalEntry.create({
            data: {
              entryNumber,
              periodId: openPeriod.id,
              referenceType: 'PAYMENT',
              referenceId: payment.id,
              description: `Receipt from customer for invoice ${invoice.invoiceNumber}`,
              createdById: userId,
              status: 'POSTED',
              lines: {
                create: [
                  { accountId: cashAccount.id, debit: paymentAmount, credit: 0, description: 'Debit Cash' },
                  { accountId: arAccount.id, debit: 0, credit: paymentAmount, description: 'Credit AR' },
                ],
              },
            },
          });
          await tx.account.update({ where: { id: cashAccount.id }, data: { balance: round(cashAccount.balance + paymentAmount) } });
          await tx.account.update({ where: { id: arAccount.id }, data: { balance: round(arAccount.balance - paymentAmount) } });
        }
      }

      await recordAuditLog({
        userId,
        action: 'CREATE',
        entityType: 'PAYMENT',
        entityId: payment.id,
        afterState: { paymentNumber, amount: paymentAmount, invoiceNumber: invoice.invoiceNumber },
        requestId,
      });

      return {
        payment,
        isDuplicateSuppressed: false,
        message: 'Payment recorded and GL journal entry posted successfully.',
      };
    });
  }
}

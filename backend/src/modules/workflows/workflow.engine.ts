import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { round } from '../../utils/decimal';
import { recordAuditLog } from '../../middleware/audit';
import { ProcurementService } from '../procurement/procurement.service';
import { ReceiptService } from '../receipt/receipt.service';
import { BillingService } from '../billing/billing.service';
import { SalesService } from '../sales/sales.service';

export interface P2PWorkflowInput {
  vendorId: string;
  departmentId: string;
  warehouseId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  simulateFailureAt?: 'APPROVAL' | 'RECEIPT' | 'INVOICE' | 'PAYMENT' | 'NONE';
  idempotencyKey: string;
}

export interface O2CWorkflowInput {
  customerId: string;
  warehouseId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  simulateFailureAt?: 'RESERVATION' | 'FULFILLMENT' | 'INVOICE' | 'PAYMENT' | 'NONE';
  idempotencyKey: string;
}

export class WorkflowEngine {
  /**
   * Assessment 07 & Capstone Challenge:
   * Purchase-to-Pay (P2P) End-to-End Orchestrator with Atomic Compensation.
   * Steps:
   * 1. PO Creation
   * 2. Department Manager Approval
   * 3. Warehouse Goods Receipt (GRN) & Stock Ledger increment
   * 4. 3-Way Matched Accounts Payable Invoice Creation
   * 5. Settlement Payment & General Ledger Double-Entry Posting
   *
   * If any step fails (or simulateFailureAt triggers), executes automated compensation!
   */
  static async executePurchaseToPay(input: P2PWorkflowInput, user: any, requestId?: string) {
    const compensationLog: string[] = [];
    const executionTrace: Array<{ step: string; status: 'SUCCESS' | 'FAILED' | 'COMPENSATED'; details?: any }> = [];

    let createdPoId: string | null = null;
    let createdGrnId: string | null = null;
    let createdInvoiceId: string | null = null;
    let createdPaymentId: string | null = null;

    try {
      // Step 1: Create Purchase Order
      const po = await ProcurementService.createPurchaseOrder(
        {
          vendorId: input.vendorId,
          departmentId: input.departmentId,
          items: input.items.map((i) => ({
            productId: i.productId,
            quantityOrdered: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
        user.id,
        requestId
      );
      createdPoId = po.id;
      executionTrace.push({ step: 'PO_CREATION', status: 'SUCCESS', details: { poNumber: po.poNumber, totalAmount: po.totalAmount } });

      if (input.simulateFailureAt === 'APPROVAL') {
        throw new AppError('Simulated failure during PO authorization phase', 422, 'SIMULATED_APPROVAL_FAILURE');
      }

      // Step 2: Approve Purchase Order
      const approvedPo = await ProcurementService.approvePurchaseOrder(
        po.id,
        { id: user.id, role: user.role, approvalLimit: user.approvalLimit },
        'Automated P2P Workflow Approval',
        requestId
      );
      executionTrace.push({ step: 'PO_APPROVAL', status: 'SUCCESS', details: { status: approvedPo.status } });

      if (input.simulateFailureAt === 'RECEIPT') {
        throw new AppError('Simulated failure during physical goods receipt', 422, 'SIMULATED_RECEIPT_FAILURE');
      }

      // Step 3: Warehouse Goods Receipt & Stock Movement
      const grn = await ReceiptService.createGoodsReceipt(
        {
          poId: po.id,
          warehouseId: input.warehouseId,
          items: po.items.map((item) => ({
            poItemId: item.id,
            productId: item.productId,
            quantityReceived: item.quantityOrdered,
            quantityAccepted: item.quantityOrdered,
            unitCost: item.unitPrice,
          })),
        },
        user.id,
        requestId
      );
      createdGrnId = grn!.id;
      executionTrace.push({ step: 'GOODS_RECEIPT', status: 'SUCCESS', details: { grnNumber: grn!.grnNumber } });

      if (input.simulateFailureAt === 'INVOICE') {
        throw new AppError('Simulated failure during AP 3-way invoice matching', 422, 'SIMULATED_INVOICE_FAILURE');
      }

      // Step 4: 3-Way Match AP Invoice Creation
      const invoice = await BillingService.createAPInvoice(
        {
          poId: po.id,
          grnId: grn!.id,
          items: po.items.map((item) => ({
            productId: item.productId,
            description: `Received goods for PO ${po.poNumber}`,
            quantity: item.quantityOrdered,
            unitPrice: item.unitPrice,
          })),
        },
        user.id,
        requestId
      );
      createdInvoiceId = invoice.id;
      executionTrace.push({ step: 'AP_INVOICE_MATCH', status: 'SUCCESS', details: { invoiceNumber: invoice.invoiceNumber, matchStatus: invoice.matchStatus } });

      if (input.simulateFailureAt === 'PAYMENT') {
        throw new AppError('Simulated failure during bank settlement processing', 422, 'SIMULATED_PAYMENT_FAILURE');
      }

      // Step 5: Settle Payment & GL Double-Entry Posting
      const paymentRes = await BillingService.recordPayment(
        {
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          idempotencyKey: input.idempotencyKey,
          paymentMethod: 'BANK_TRANSFER',
          notes: `Settlement of P2P workflow for PO ${po.poNumber}`,
        },
        user.id,
        requestId
      );
      createdPaymentId = paymentRes.payment.id;
      executionTrace.push({ step: 'PAYMENT_AND_GL_POSTING', status: 'SUCCESS', details: { paymentNumber: paymentRes.payment.paymentNumber } });

      return {
        status: 'COMPLETED',
        workflow: 'PURCHASE_TO_PAY',
        summary: {
          purchaseOrderId: po.id,
          poNumber: po.poNumber,
          goodsReceiptId: grn!.id,
          grnNumber: grn!.grnNumber,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          paymentId: paymentRes.payment.id,
          paymentNumber: paymentRes.payment.paymentNumber,
          totalAmount: invoice.totalAmount,
        },
        trace: executionTrace,
      };
    } catch (error: any) {
      // -----------------------------------------------------------------------
      // Compensation & Rollback Handler (Domain-Specific Capstone Challenge)
      // -----------------------------------------------------------------------
      compensationLog.push(`Workflow aborted with error: ${error.message}. Starting safe compensation...`);

      if (createdPaymentId) {
        compensationLog.push(`Compensating payment ${createdPaymentId}: Marking REFUNDED`);
        await prisma.payment.update({ where: { id: createdPaymentId }, data: { status: 'REFUNDED' } });
      }

      if (createdInvoiceId) {
        compensationLog.push(`Compensating invoice ${createdInvoiceId}: Voiding AP invoice`);
        await prisma.invoice.update({ where: { id: createdInvoiceId }, data: { status: 'VOIDED' } });
      }

      if (createdGrnId) {
        compensationLog.push(`Compensating goods receipt ${createdGrnId}: Rolling back received inventory`);
        // Revert stock levels
        const grnItems = await prisma.goodsReceiptItem.findMany({ where: { grnId: createdGrnId } });
        for (const item of grnItems) {
          const stock = await prisma.stockLevel.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: input.warehouseId,
              },
            },
          });
          if (stock) {
            await prisma.stockLevel.update({
              where: { id: stock.id },
              data: { quantityOnHand: round(Math.max(0, stock.quantityOnHand - item.quantityAccepted)) },
            });
          }
        }
        await prisma.goodsReceipt.update({ where: { id: createdGrnId }, data: { status: 'REJECTED' } });
      }

      if (createdPoId) {
        compensationLog.push(`Compensating purchase order ${createdPoId}: Setting status CANCELLED`);
        await prisma.purchaseOrder.update({ where: { id: createdPoId }, data: { status: 'CANCELLED' } });
      }

      executionTrace.push({
        step: 'COMPENSATION_ROLLBACK',
        status: 'COMPENSATED',
        details: { logs: compensationLog, originalError: error.message },
      });

      await recordAuditLog({
        userId: user.id,
        action: 'INCIDENT_RESOLVE',
        entityType: 'PO',
        entityId: createdPoId,
        success: false,
        failureReason: `P2P Workflow Failed at step with safe rollback. Error: ${error.message}`,
        requestId,
      });

      return {
        status: 'FAILED_SAFELY_COMPENSATED',
        workflow: 'PURCHASE_TO_PAY',
        error: error.message,
        trace: executionTrace,
        compensationLog,
      };
    }
  }

  /**
   * Order-to-Cash (O2C) End-to-End Orchestrator
   */
  static async executeOrderToCash(input: O2CWorkflowInput, user: any, requestId?: string) {
    const executionTrace: Array<{ step: string; status: 'SUCCESS' | 'FAILED'; details?: any }> = [];

    // Step 1: Create Sales Order
    const so = await SalesService.createSalesOrder(
      {
        customerId: input.customerId,
        items: input.items.map((i) => ({
          productId: i.productId,
          quantityOrdered: i.quantity,
          unitPrice: i.unitPrice,
        })),
      },
      user.id,
      requestId
    );
    executionTrace.push({ step: 'SALES_ORDER_CREATION', status: 'SUCCESS', details: { soNumber: so.soNumber, totalAmount: so.totalAmount } });

    // Step 2: Stock Reservation
    const reservedSo = await SalesService.reserveStock(so.id, input.warehouseId, user.id, requestId);
    executionTrace.push({ step: 'STOCK_RESERVATION', status: 'SUCCESS', details: { status: reservedSo.status } });

    // Step 3: Fulfillment & Inventory Deduction
    const fulfilledSo = await SalesService.fulfillSalesOrder(so.id, input.warehouseId, user.id, requestId);
    executionTrace.push({ step: 'ORDER_FULFILLMENT', status: 'SUCCESS', details: { status: fulfilledSo.status } });

    // Step 4: Issue AR Invoice
    const invoice = await BillingService.createARInvoice(so.id, user.id, requestId);
    executionTrace.push({ step: 'AR_INVOICE_ISSUED', status: 'SUCCESS', details: { invoiceNumber: invoice.invoiceNumber } });

    // Step 5: Settle Payment & GL Double-Entry Posting
    const paymentRes = await BillingService.recordPayment(
      {
        invoiceId: invoice.id,
        amount: invoice.totalAmount,
        idempotencyKey: input.idempotencyKey,
        paymentMethod: 'BANK_TRANSFER',
        notes: `Settlement of O2C workflow for SO ${so.soNumber}`,
      },
      user.id,
      requestId
    );
    executionTrace.push({ step: 'PAYMENT_AND_GL_POSTING', status: 'SUCCESS', details: { paymentNumber: paymentRes.payment.paymentNumber } });

    return {
      status: 'COMPLETED',
      workflow: 'ORDER_TO_CASH',
      summary: {
        salesOrderId: so.id,
        soNumber: so.soNumber,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paymentId: paymentRes.payment.id,
        paymentNumber: paymentRes.payment.paymentNumber,
        totalAmount: invoice.totalAmount,
      },
      trace: executionTrace,
    };
  }
}

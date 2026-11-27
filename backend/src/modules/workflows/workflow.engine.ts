import { createHash } from 'node:crypto';
import { db, transaction } from '../../config/transaction';
import { assert } from '../../utils/business';
import { ProcurementService } from '../procurement/procurement.service';
import { ReceiptService } from '../receipt/receipt.service';
import { BillingService } from '../billing/billing.service';
import { SalesService } from '../sales/sales.service';
import { recordAuditLog } from '../../middleware/audit';

export interface P2PWorkflowInput {
  vendorId: string; departmentId: string; warehouseId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  simulateFailureAt?: 'APPROVAL' | 'RECEIPT' | 'INVOICE' | 'PAYMENT' | 'NONE'; idempotencyKey: string;
}
export interface O2CWorkflowInput {
  customerId: string; warehouseId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  simulateFailureAt?: 'RESERVATION' | 'FULFILLMENT' | 'INVOICE' | 'PAYMENT' | 'NONE'; idempotencyKey: string;
}
export class WorkflowEngine {
  private static async execute(workflow: string, input: P2PWorkflowInput | O2CWorkflowInput, user: any, requestId: string | undefined, work: (trace: any[], fail: (stage: string) => void) => Promise<any>) {
    const fingerprint = createHash('sha256').update(JSON.stringify({ workflow, input, userId: user.id })).digest('hex');
    const existing = await db().workflowRun.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      assert(existing.fingerprint === fingerprint && existing.userId === user.id, 'Workflow idempotency key conflicts with another request', 'IDEMPOTENCY_CONFLICT', 409);
      return { ...JSON.parse(existing.result), isDuplicateSuppressed: true };
    }
    const trace: any[] = [];
    const fail = (stage: string) => { if (input.simulateFailureAt === stage) throw new Error(`Controlled failure at ${stage}`); };
    try {
      return await transaction(async tx => {
        trace.length = 0;
        const summary = await work(trace, fail);
        const result = { status: 'COMPLETED', workflow, summary, trace };
        await tx.workflowRun.create({ data: { idempotencyKey: input.idempotencyKey, fingerprint, userId: user.id, workflow, status: result.status, result: JSON.stringify(result) } });
        return result;
      });
    } catch (error: any) {
      if (['P2002','P2034'].includes(error.code)) {
        const run = await db().workflowRun.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (run && run.fingerprint === fingerprint) return { ...JSON.parse(run.result), isDuplicateSuppressed: true };
        throw error;
      }
      const result = { status: 'FAILED_SAFELY_COMPENSATED', workflow, error: error.statusCode ? error.message : (input.simulateFailureAt && input.simulateFailureAt !== 'NONE' ? `Controlled failure at ${input.simulateFailureAt}` : 'Workflow could not complete; all changes rolled back'), trace: [...trace.map(t => ({ ...t, status: 'COMPENSATED' })), { step: 'TRANSACTION_ROLLBACK', status: 'COMPENSATED' }], compensationLog: ['Database rolled back all order, stock, receipt, invoice, payment, journal and audit changes atomically.'] };
      await db().workflowRun.create({ data: { idempotencyKey: input.idempotencyKey, fingerprint, userId: user.id, workflow, status: result.status, result: JSON.stringify(result) } });
      await recordAuditLog({ userId: user.id, action: 'VOID', entityType: 'PO', success: false, failureReason: result.error, requestId });
      return result;
    }
  }
  static executePurchaseToPay(input: P2PWorkflowInput, user: any, requestId?: string) {
    assert(['ERP_ADMINISTRATOR','FINANCE_OFFICER'].includes(user.role), 'Finance or administrator authorization is required to execute all purchase and settlement stages', 'FORBIDDEN', 403);
    return this.execute('PURCHASE_TO_PAY', input, user, requestId, async (trace, fail) => {
      const po = await ProcurementService.createPurchaseOrder({ vendorId: input.vendorId, departmentId: input.departmentId, items: input.items.map(i => ({ productId: i.productId, quantityOrdered: i.quantity, unitPrice: i.unitPrice })) }, user.id, requestId);
      trace.push({ step: 'PO_CREATION', status: 'SUCCESS', details: { poNumber: po.poNumber } }); fail('APPROVAL');
      await ProcurementService.approvePurchaseOrder(po.id, user, 'Authorized atomic P2P execution', requestId);
      trace.push({ step: 'PO_APPROVAL', status: 'SUCCESS' }); fail('RECEIPT');
      const grn = await ReceiptService.createGoodsReceipt({ poId: po.id, warehouseId: input.warehouseId, items: po.items.map(i => ({ poItemId: i.id, productId: i.productId, quantityReceived: i.quantityOrdered, quantityAccepted: i.quantityOrdered, unitCost: i.unitPrice })) }, user.id, requestId);
      trace.push({ step: 'GOODS_RECEIPT', status: 'SUCCESS', details: { grnNumber: grn!.grnNumber } }); fail('INVOICE');
      const invoice = await BillingService.createAPInvoice({ poId: po.id, grnId: grn!.id, items: po.items.map(i => ({ productId: i.productId, description: i.product.name, quantity: i.quantityOrdered, unitPrice: i.unitPrice, taxRate: i.taxRate })) }, user.id, requestId);
      trace.push({ step: 'AP_INVOICE_3_WAY_MATCH', status: 'SUCCESS', details: { invoiceNumber: invoice.invoiceNumber } }); fail('PAYMENT');
      const { payment } = await BillingService.recordPayment({ invoiceId: invoice.id, amount: invoice.totalAmount, idempotencyKey: input.idempotencyKey }, user.id, requestId);
      trace.push({ step: 'PAYMENT_AND_GL_POSTING', status: 'SUCCESS', details: { paymentNumber: payment.paymentNumber } });
      return { purchaseOrderId: po.id, poNumber: po.poNumber, goodsReceiptId: grn!.id, grnNumber: grn!.grnNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, paymentId: payment.id, paymentNumber: payment.paymentNumber, totalAmount: invoice.totalAmount };
    });
  }
  static executeOrderToCash(input: O2CWorkflowInput, user: any, requestId?: string) {
    assert(['ERP_ADMINISTRATOR','FINANCE_OFFICER'].includes(user.role), 'Finance or administrator authorization is required to execute all sales and settlement stages', 'FORBIDDEN', 403);
    return this.execute('ORDER_TO_CASH', input, user, requestId, async (trace, fail) => {
      const so = await SalesService.createSalesOrder({ customerId: input.customerId, items: input.items.map(i => ({ productId: i.productId, quantityOrdered: i.quantity, unitPrice: i.unitPrice })) }, user.id, requestId);
      trace.push({ step: 'SALES_ORDER_CREATION', status: 'SUCCESS', details: { soNumber: so.soNumber } }); fail('RESERVATION');
      await SalesService.reserveStock(so.id, input.warehouseId, user.id, requestId);
      trace.push({ step: 'STOCK_RESERVATION', status: 'SUCCESS' }); fail('FULFILLMENT');
      await SalesService.fulfillSalesOrder(so.id, input.warehouseId, user.id, requestId);
      trace.push({ step: 'ORDER_FULFILLMENT', status: 'SUCCESS' }); fail('INVOICE');
      const invoice = await BillingService.createARInvoice(so.id, user.id, requestId);
      trace.push({ step: 'AR_INVOICE_ISSUED', status: 'SUCCESS', details: { invoiceNumber: invoice.invoiceNumber } }); fail('PAYMENT');
      const { payment } = await BillingService.recordPayment({ invoiceId: invoice.id, amount: invoice.totalAmount, idempotencyKey: input.idempotencyKey }, user.id, requestId);
      trace.push({ step: 'PAYMENT_AND_GL_POSTING', status: 'SUCCESS', details: { paymentNumber: payment.paymentNumber } });
      return { salesOrderId: so.id, soNumber: so.soNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, paymentId: payment.id, paymentNumber: payment.paymentNumber, totalAmount: invoice.totalAmount };
    });
  }
}

import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/invoices', BillingController.getInvoices);
router.get('/invoices/:id', BillingController.getInvoiceById);
router.post('/invoices/ap', requireRole(Roles.ADMIN, Roles.FINANCE, Roles.PROCUREMENT), validate(z.object({ poId: id, grnId: id.optional(), invoiceNumber: text.optional(), dueDate: z.coerce.date().optional(), items: items(z.object({ productId: id, description: text, quantity: positive, unitPrice: money, taxRate: rate })) })), BillingController.createAPInvoice);
router.post('/invoices/ar', requireRole(Roles.ADMIN, Roles.FINANCE, Roles.SALES), validate(z.object({ soId: id })), BillingController.createARInvoice);
router.post('/payments', requireRole(Roles.ADMIN, Roles.FINANCE), validate(z.object({ invoiceId: id, amount: positive, paymentMethod: z.enum(['BANK_TRANSFER','CREDIT_CARD','CHECK','WIRE']).optional(), idempotencyKey: text, referenceNumber: text.optional(), notes: text.optional() })), BillingController.recordPayment);

export default router;

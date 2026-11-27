import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/invoices', BillingController.getInvoices);
router.get('/invoices/:id', BillingController.getInvoiceById);
router.post('/invoices/ap', requireRole(Roles.ADMIN, Roles.FINANCE, Roles.PROCUREMENT), BillingController.createAPInvoice);
router.post('/invoices/ar', requireRole(Roles.ADMIN, Roles.FINANCE, Roles.SALES), BillingController.createARInvoice);
router.post('/payments', requireRole(Roles.ADMIN, Roles.FINANCE), BillingController.recordPayment);

export default router;

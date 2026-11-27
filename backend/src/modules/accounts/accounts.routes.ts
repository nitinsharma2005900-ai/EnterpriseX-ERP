import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { AccountsController } from './accounts.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);
router.use(requireRole(Roles.ADMIN, Roles.FINANCE, Roles.DEPT_MANAGER));

// Accounts
router.get('/accounts', AccountsController.getChartOfAccounts);
router.post('/accounts', requireRole(Roles.ADMIN, Roles.FINANCE), validate(z.object({ code: text, name: text, category: z.enum(['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE']), subcategory: text.optional(), currency: z.string().length(3).optional() })), AccountsController.createAccount);

// Periods
router.get('/periods', AccountsController.getPeriods);
router.post('/periods', requireRole(Roles.ADMIN, Roles.FINANCE), validate(z.object({ name: text, startDate: z.coerce.date(), endDate: z.coerce.date() }).refine(v => v.endDate > v.startDate)), AccountsController.createPeriod);
router.patch('/periods/:id/close', requireRole(Roles.ADMIN, Roles.FINANCE), AccountsController.closePeriod);

// Journals & General Ledger
router.get('/journals', AccountsController.getJournalEntries);
router.post('/journals', requireRole(Roles.ADMIN, Roles.FINANCE), validate(z.object({ entryNumber: text, date: z.coerce.date().optional(), periodId: id, referenceType: text, referenceId: id.optional(), description: text, lines: items(z.object({ accountId: id, description: text.optional(), debit: money, credit: money })) })), AccountsController.postJournalEntry);
router.get('/general-ledger', AccountsController.getGeneralLedger);

export default router;

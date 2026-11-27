import { Router } from 'express';
import { AccountsController } from './accounts.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();

router.use(authenticate);

// Accounts
router.get('/accounts', AccountsController.getChartOfAccounts);
router.post('/accounts', requireRole(Roles.ADMIN, Roles.FINANCE), AccountsController.createAccount);

// Periods
router.get('/periods', AccountsController.getPeriods);
router.post('/periods', requireRole(Roles.ADMIN, Roles.FINANCE), AccountsController.createPeriod);
router.patch('/periods/:id/close', requireRole(Roles.ADMIN, Roles.FINANCE), AccountsController.closePeriod);

// Journals & General Ledger
router.get('/journals', AccountsController.getJournalEntries);
router.post('/journals', requireRole(Roles.ADMIN, Roles.FINANCE), AccountsController.postJournalEntry);
router.get('/general-ledger', AccountsController.getGeneralLedger);

export default router;

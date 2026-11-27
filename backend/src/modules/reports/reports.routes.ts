import { requireRole, Roles } from '../../middleware/rbac';
import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);


router.get('/trial-balance', requireRole(Roles.ADMIN, Roles.FINANCE, Roles.DEPT_MANAGER), ReportsController.getTrialBalance);
router.get('/executive-analytics', ReportsController.getExecutiveAnalytics);

export default router;

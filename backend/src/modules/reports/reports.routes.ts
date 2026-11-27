import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/trial-balance', ReportsController.getTrialBalance);
router.get('/executive-analytics', ReportsController.getExecutiveAnalytics);

export default router;

import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { IntegrationsController } from './integrations.controller';
import { retryJob } from './jobs';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.post('/email/send', requireRole(Roles.ADMIN, Roles.FINANCE), validate(z.object({ to: z.string().email(), subject: text, body: text, idempotencyKey: text.optional() })), IntegrationsController.sendEmail);
router.get('/email/queue', requireRole(Roles.ADMIN, Roles.FINANCE), IntegrationsController.getEmailQueue);
router.post('/jobs/:id/retry', requireRole(Roles.ADMIN), async (req, res, next) => {
  try {
    const job = await prisma.integrationJob.findUnique({ where: { id: req.params.id } });
    if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');
    if (job.status !== 'FAILED') throw new AppError('Only failed jobs can be retried', 409, 'INVALID_STATUS');
    await retryJob(job.id);
    res.json({ success: true, data: { id: job.id, status: 'QUEUED' } });
  } catch (error) { next(error); }
});
router.post('/vendor-simulator/dispatch', validate(z.object({ poNumber: text })), IntegrationsController.simulateVendorDispatch);
router.get('/accounting/export', requireRole(Roles.ADMIN, Roles.FINANCE), IntegrationsController.exportAccounting);
router.post('/accounting/import', requireRole(Roles.ADMIN, Roles.FINANCE), IntegrationsController.importAccounting);

export default router;

import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', requireRole(Roles.ADMIN, Roles.FINANCE), async (req, res, next) => {
  try {
    const where: any = {};
    if (req.query.action) where.action = req.query.action as string;
    if (req.query.entityType) where.entityType = req.query.entityType as string;
    if (req.query.userId) where.userId = req.query.userId as string;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { user: { select: { fullName: true, email: true, role: true } } },
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

export default router;

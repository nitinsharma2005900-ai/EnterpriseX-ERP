import { Router } from 'express';
import { VendorsController } from './vendors.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', VendorsController.getVendors);
router.get('/:id', VendorsController.getVendorById);
router.post('/', requireRole(Roles.ADMIN, Roles.PROCUREMENT), VendorsController.createVendor);
router.put('/:id', requireRole(Roles.ADMIN, Roles.PROCUREMENT), VendorsController.updateVendor);

export default router;

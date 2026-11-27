import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { VendorsController } from './vendors.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', VendorsController.getVendors);
router.get('/:id', VendorsController.getVendorById);
router.post('/', requireRole(Roles.ADMIN, Roles.PROCUREMENT), validate(z.object({ code: text, name: text, email: z.string().email(), phone: text.optional(), address: text.optional(), taxNumber: text.optional(), paymentTerms: z.enum(['NET15','NET30','NET60']).optional(), rating: z.number().min(0).max(5).optional() })), VendorsController.createVendor);
router.put('/:id', requireRole(Roles.ADMIN, Roles.PROCUREMENT), validate(z.object({ name: text.optional(), email: z.string().email().optional(), phone: text.optional(), address: text.optional(), status: z.enum(['ACTIVE','SUSPENDED','INACTIVE']).optional(), paymentTerms: z.enum(['NET15','NET30','NET60']).optional() })), VendorsController.updateVendor);

export default router;

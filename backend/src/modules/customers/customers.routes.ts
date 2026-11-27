import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', CustomersController.getCustomers);
router.get('/:id', CustomersController.getCustomerById);
router.post('/', requireRole(Roles.ADMIN, Roles.SALES), validate(z.object({ code: text, name: text, email: z.string().email(), phone: text.optional(), address: text.optional(), taxNumber: text.optional(), creditLimit: money.optional(), paymentTerms: text.optional() })), CustomersController.createCustomer);

export default router;

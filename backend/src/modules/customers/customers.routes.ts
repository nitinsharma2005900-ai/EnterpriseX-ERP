import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, Roles } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', CustomersController.getCustomers);
router.get('/:id', CustomersController.getCustomerById);
router.post('/', requireRole(Roles.ADMIN, Roles.SALES), CustomersController.createCustomer);

export default router;

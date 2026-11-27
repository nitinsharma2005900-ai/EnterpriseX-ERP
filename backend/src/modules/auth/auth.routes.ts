import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.get('/demo-accounts', AuthController.getDemoAccounts);
router.get('/me', authenticate, AuthController.getMe);

export default router;

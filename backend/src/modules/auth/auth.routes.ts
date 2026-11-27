import { AuthService } from './auth.service';
import { validate, z, id, text, money, positive, rate, orderItem, items } from '../../middleware/validate';
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/login', validate(z.object({ email: z.string().email().max(254).transform(s => s.toLowerCase()), password: z.string().min(1).max(128) })), AuthController.login);
router.post('/refresh', validate(z.object({ refreshToken: text })), AuthController.refreshToken);
router.get('/demo-accounts', AuthController.getDemoAccounts);
router.get('/me', authenticate, AuthController.getMe);

router.post('/logout', authenticate, async (req, res, next) => { try { await AuthService.logout(req.user!.id); res.json({ success: true }); } catch (err) { next(err); } });
export default router;

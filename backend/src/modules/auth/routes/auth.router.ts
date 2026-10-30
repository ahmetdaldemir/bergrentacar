import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/signup', AuthController.signup);
router.get('/me', authenticate, AuthController.me);
router.patch('/dashboard-layout', authenticate, AuthController.updateDashboardLayout);
router.post('/logout', authenticate, AuthController.logout);

export default router;

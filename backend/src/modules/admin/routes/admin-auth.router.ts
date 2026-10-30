import { Router } from 'express';
import { AdminAuthController } from '../controllers/admin-auth.controller';
import { authenticateAdmin } from '../middleware/admin-auth.middleware';

const router = Router();

router.post('/login', AdminAuthController.login);
router.get('/me', authenticateAdmin, AdminAuthController.me);

export default router;


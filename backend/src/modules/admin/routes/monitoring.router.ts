import { Router } from 'express';
import { EmailTestController } from '../controllers/email-test.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

router.post('/test-email', authenticate, EmailTestController.sendTestEmail);

export default router;

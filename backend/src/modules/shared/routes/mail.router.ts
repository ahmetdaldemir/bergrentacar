/**
 * Mail Routes
 */

import { Router } from 'express';
import { MailController } from '../controllers/mail.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

// Send email endpoint
// Can be used with or without authentication
// If authenticated, tenantId will be taken from auth
// If not authenticated, tenantId must be provided in request body
router.post('/send', MailController.send);

// Send bulk emails endpoint
router.post('/send-bulk', MailController.sendBulk);

export default router;


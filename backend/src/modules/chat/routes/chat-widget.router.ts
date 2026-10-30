/**
 * Public Chat Widget Routes
 * These routes are for widget visitors (no authentication required)
 */

import { Router } from 'express';
import { ChatWidgetController } from '../controllers/chat-widget.controller';

const router = Router();

// Public routes for widget - validate via publicKey query param
router.post('/rooms', ChatWidgetController.createRoom);
router.get('/rooms/:id/messages', ChatWidgetController.getMessages);

export default router;


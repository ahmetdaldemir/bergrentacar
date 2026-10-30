import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// All routes require authentication and authorization
router.use(authenticate);

router.get('/rooms', authorize(Permission.CHAT_VIEW), ChatController.listRooms);
router.post('/rooms', authorize(Permission.CHAT_MANAGE), ChatController.createRoom);
router.get('/rooms/:id', authorize(Permission.CHAT_VIEW), ChatController.getRoom);
router.post('/rooms/:id/messages', authorize(Permission.CHAT_MANAGE), ChatController.sendMessage);
router.post('/rooms/:id/read', authorize(Permission.CHAT_VIEW), ChatController.markAsRead);

router.get('/widget-token', authorize(Permission.CHAT_MANAGE), ChatController.getWidgetToken);
router.post('/widget-token/regenerate', authorize(Permission.CHAT_MANAGE), ChatController.regenerateWidgetToken);

export default router;


import { Router } from 'express';
import { TenantMessageController } from '../controllers/tenant-message.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authenticate);

router.get('/', TenantMessageController.list);
router.get('/:id', TenantMessageController.getById);
router.post('/', TenantMessageController.create);
router.put('/:id', TenantMessageController.update);
router.delete('/:id', TenantMessageController.delete);
router.patch('/:id/read', TenantMessageController.markAsRead);

export default router;


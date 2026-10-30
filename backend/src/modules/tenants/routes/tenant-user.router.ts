import { Router } from 'express';
import { TenantUserController } from '../controllers/tenant-user.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// Tüm route'lar authentication ve authorization gerektirir
router.use(authenticate);

router.get('/', authorize(Permission.USER_VIEW), TenantUserController.list);
router.get('/:id', authorize(Permission.USER_VIEW), TenantUserController.getById);
router.post('/', authorize(Permission.USER_CREATE), TenantUserController.create);
router.put('/:id', authorize(Permission.USER_UPDATE), TenantUserController.update);
router.delete('/:id', authorize(Permission.USER_DELETE), TenantUserController.delete);

export default router;


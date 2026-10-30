import { Router } from 'express';
import { CrmPageCategoryController } from '../controllers/crm-page-category.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// Public endpoints (for API/frontend)
router.get('/', CrmPageCategoryController.list);
router.get('/:id', CrmPageCategoryController.getById);

// Protected endpoints (for admin panel)
router.use(authenticate);
router.post('/', authorize(Permission.CRM_CREATE), CrmPageCategoryController.create);
router.put('/:id', authorize(Permission.CRM_UPDATE), CrmPageCategoryController.update);
router.delete('/:id', authorize(Permission.CRM_DELETE), CrmPageCategoryController.remove);

export default router;


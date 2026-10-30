import { Router } from 'express';
import { TenantLanguageController } from '../controllers/tenant-language.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List and get routes (view permission)
router.get('/', authorize(Permission.TENANT_VIEW), TenantLanguageController.list);
router.get('/active-ids', authorize(Permission.TENANT_VIEW), TenantLanguageController.getActiveLanguageIds);
router.get('/:id', authorize(Permission.TENANT_VIEW), TenantLanguageController.getById);

// Create, update, delete routes (tenant management permissions)
router.post('/', authorize(Permission.TENANT_MANAGE), TenantLanguageController.create);
router.put('/:id', authorize(Permission.TENANT_MANAGE), TenantLanguageController.update);
router.delete('/:id', authorize(Permission.TENANT_MANAGE), TenantLanguageController.delete);
router.post('/bulk-update', authorize(Permission.TENANT_MANAGE), TenantLanguageController.bulkUpdate);
router.post('/initialize', authorize(Permission.TENANT_MANAGE), TenantLanguageController.initialize);
router.post('/:id/set-default', authorize(Permission.TENANT_MANAGE), TenantLanguageController.setDefault);

export { router as tenantLanguageRouter };

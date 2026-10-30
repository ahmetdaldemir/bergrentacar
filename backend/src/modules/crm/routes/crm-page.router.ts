import { Router } from 'express';
import { CrmPageController } from '../controllers/crm-page.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { publicApiResponseCache } from '../../../middleware/api-public-response-cache.middleware';

const router = Router();

// Public endpoints (for API/frontend)
router.get(
  '/',
  publicApiResponseCache({
    routeKey: 'crm:pages:list',
    queryKeys: ['tenantId', 'languageId', 'categoryId'],
    requireTenant: true,
  }),
  CrmPageController.list,
);
router.get(
  '/grouped',
  publicApiResponseCache({
    routeKey: 'crm:pages:grouped',
    queryKeys: ['tenantId', 'languageId'],
    requireTenant: true,
  }),
  CrmPageController.listGroupedByCategory,
); // /grouped must be before /:id
router.get('/slug/:slug', CrmPageController.getBySlug);
router.get('/:id', CrmPageController.getById);

// Protected endpoints (for admin panel)
router.use(authenticate);
router.post('/', authorize(Permission.CRM_CREATE), CrmPageController.create);
router.put('/:id', authorize(Permission.CRM_UPDATE), CrmPageController.update);
router.delete('/:id', authorize(Permission.CRM_DELETE), CrmPageController.remove);

export default router;


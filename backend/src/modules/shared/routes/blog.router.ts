import { Router } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { publicApiResponseCache } from '../../../middleware/api-public-response-cache.middleware';

const router = Router();

// Public endpoints - no authentication required
router.get(
  '/',
  publicApiResponseCache({
    routeKey: 'blogs:list',
    queryKeys: ['tenantId', 'languageId', 'locationId'],
    requireTenant: true,
  }),
  BlogController.list,
);
router.get('/:id', BlogController.getById);

// Protected endpoints - authentication and authorization required
router.use(authenticate);
router.post('/', authorize(Permission.BLOG_CREATE), BlogController.create);
router.put('/:id', authorize(Permission.BLOG_UPDATE), BlogController.update);
router.delete('/:id', authorize(Permission.BLOG_DELETE), BlogController.remove);
router.post('/generate-content', authorize(Permission.BLOG_CREATE), BlogController.generateContent);
router.post('/:id/regenerate-content', authorize(Permission.BLOG_UPDATE), BlogController.regenerateContent);

export default router;


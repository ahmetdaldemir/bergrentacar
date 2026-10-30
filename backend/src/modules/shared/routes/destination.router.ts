import { Router } from 'express';
import { DestinationController } from '../controllers/destination.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { publicApiResponseCache } from '../../../middleware/api-public-response-cache.middleware';

const router = Router();

// Public endpoints - no authentication required
router.get(
  '/',
  publicApiResponseCache({
    routeKey: 'destinations:list',
    queryKeys: ['tenantId', 'languageId'],
    requireTenant: true,
  }),
  DestinationController.list,
);
router.get('/:id', DestinationController.getById);

// Protected endpoints - authentication and authorization required
router.use(authenticate);
router.post('/', authorize(Permission.DESTINATION_CREATE), DestinationController.create);
router.patch('/:id', authorize(Permission.DESTINATION_UPDATE), DestinationController.update);
router.delete('/:id', authorize(Permission.DESTINATION_DELETE), DestinationController.remove);
router.post('/import', authorize(Permission.DESTINATION_CREATE), DestinationController.importFromApi);
router.post('/generate-content', authorize(Permission.DESTINATION_CREATE), DestinationController.generateContent);

export default router;

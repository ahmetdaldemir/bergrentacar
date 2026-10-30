import { Router } from 'express';
import { TransferPopularRouteController } from '../controllers/transfer-popular-route.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List and get routes (view permission)
router.get('/', authorize(Permission.TRANSFER_VIEW), TransferPopularRouteController.list);
router.get('/price', authorize(Permission.TRANSFER_VIEW), TransferPopularRouteController.getPrice);
router.get('/fixed-price', authorize(Permission.TRANSFER_VIEW), TransferPopularRouteController.getFixedPrice); // Legacy
router.get('/:id', authorize(Permission.TRANSFER_VIEW), TransferPopularRouteController.getById);

// Create, update, delete routes (transfer permissions)
router.post('/', authorize(Permission.TRANSFER_CREATE), TransferPopularRouteController.create);
router.put('/:id', authorize(Permission.TRANSFER_UPDATE), TransferPopularRouteController.update);
router.delete('/:id', authorize(Permission.TRANSFER_DELETE), TransferPopularRouteController.delete);

export { router as transferPopularRouteRouter };

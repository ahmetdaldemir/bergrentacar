import { Router } from 'express';
import { LocationController } from '../controllers/location.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.get('/', LocationController.list);
router.use(authenticate);
router.get('/:id', LocationController.getById);
router.post('/', authorize(Permission.LOCATION_CREATE), LocationController.create);
router.put('/:id', authorize(Permission.LOCATION_UPDATE), LocationController.update);
router.patch('/:id', authorize(Permission.LOCATION_UPDATE), LocationController.update);
router.delete('/:id', authorize(Permission.LOCATION_DELETE), LocationController.remove);

export default router;

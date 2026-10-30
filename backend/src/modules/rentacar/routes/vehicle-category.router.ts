import { Router } from 'express';
import { VehicleCategoryController } from '../controllers/vehicle-category.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/', authorize(Permission.VEHICLE_VIEW), VehicleCategoryController.list);
router.post('/', authorize(Permission.VEHICLE_CREATE), VehicleCategoryController.create);
router.get('/:id', authorize(Permission.VEHICLE_VIEW), VehicleCategoryController.getById);
router.put('/:id', authorize(Permission.VEHICLE_UPDATE), VehicleCategoryController.update);
router.patch('/:id', authorize(Permission.VEHICLE_UPDATE), VehicleCategoryController.update);
router.delete('/:id', authorize(Permission.VEHICLE_DELETE), VehicleCategoryController.remove);

export default router;

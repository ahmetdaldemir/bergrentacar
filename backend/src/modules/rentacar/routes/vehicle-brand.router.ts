import { Router } from 'express';
import { VehicleBrandController } from '../controllers/vehicle-brand.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/', authorize(Permission.VEHICLE_VIEW), VehicleBrandController.list);
router.post('/', authorize(Permission.VEHICLE_CREATE), VehicleBrandController.create);
router.get('/:id', authorize(Permission.VEHICLE_VIEW), VehicleBrandController.getById);
router.put('/:id', authorize(Permission.VEHICLE_UPDATE), VehicleBrandController.update);
router.patch('/:id', authorize(Permission.VEHICLE_UPDATE), VehicleBrandController.update);
router.delete('/:id', authorize(Permission.VEHICLE_DELETE), VehicleBrandController.remove);

export default router;

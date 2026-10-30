import { Router } from 'express';
import { VehicleModelController } from '../controllers/vehicle-model.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/', authorize(Permission.VEHICLE_VIEW), VehicleModelController.list);
router.post('/', authorize(Permission.VEHICLE_CREATE), VehicleModelController.create);
router.get('/:id', authorize(Permission.VEHICLE_VIEW), VehicleModelController.getById);
router.put('/:id', authorize(Permission.VEHICLE_UPDATE), VehicleModelController.update);
router.patch('/:id', authorize(Permission.VEHICLE_UPDATE), VehicleModelController.update);
router.delete('/:id', authorize(Permission.VEHICLE_DELETE), VehicleModelController.remove);

export default router;

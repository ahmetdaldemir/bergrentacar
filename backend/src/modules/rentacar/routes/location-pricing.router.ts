import { Router } from 'express';
import { LocationPricingController } from '../controllers/location-pricing.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/', authorize(Permission.LOCATION_VIEW), LocationPricingController.listByLocation);
router.get('/by-vehicle', authorize(Permission.LOCATION_VIEW), LocationPricingController.getByLocationAndVehicle);
router.post('/', authorize(Permission.LOCATION_UPDATE), LocationPricingController.upsert);
router.post('/bulk', authorize(Permission.LOCATION_UPDATE), LocationPricingController.bulkUpsert);
router.post('/bulk-copy', authorize(Permission.LOCATION_UPDATE), LocationPricingController.bulkCopyPrice);
router.delete('/:id', authorize(Permission.LOCATION_UPDATE), LocationPricingController.remove);

export default router;

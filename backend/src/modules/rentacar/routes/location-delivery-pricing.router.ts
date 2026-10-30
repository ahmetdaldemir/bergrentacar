import { Router } from 'express';
import { LocationDeliveryPricingController } from '../controllers/location-delivery-pricing.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/', authorize(Permission.LOCATION_VIEW), LocationDeliveryPricingController.listByLocation);
router.post('/', authorize(Permission.LOCATION_UPDATE), LocationDeliveryPricingController.upsert);
router.post('/bulk', authorize(Permission.LOCATION_UPDATE), LocationDeliveryPricingController.bulkUpsert);
router.delete('/:id', authorize(Permission.LOCATION_UPDATE), LocationDeliveryPricingController.remove);

export default router;

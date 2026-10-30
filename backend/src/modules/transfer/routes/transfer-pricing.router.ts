import { Router } from 'express';
import { TransferPricingController } from '../controllers/transfer-pricing.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', TransferPricingController.list);
router.post('/calculate', TransferPricingController.calculatePrice); // Must be before /:id
router.get('/vehicle/:vehicleId', TransferPricingController.getByVehicleId);
router.get('/:id', TransferPricingController.getById);
router.post('/', TransferPricingController.create);
router.put('/:id', TransferPricingController.update);
router.delete('/:id', TransferPricingController.delete);

export { router as transferPricingRouter };


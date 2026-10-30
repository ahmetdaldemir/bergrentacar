import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { requireFeature } from '../../shared/middleware/feature-check.middleware';
import { HotelContractController } from '../controllers/hotel-contract.controller';

const router = Router();

router.use(authenticate);
router.use(requireFeature('hotel'));

router.get('/', authorize(Permission.HOTEL_SALES_VIEW), HotelContractController.list);
router.get('/available', authorize(Permission.HOTEL_SALES_VIEW), HotelContractController.findAvailable);
router.post('/', authorize(Permission.HOTEL_SALES_CREATE), HotelContractController.create);
router.get('/:id', authorize(Permission.HOTEL_SALES_VIEW), HotelContractController.getById);
router.get('/:id/availability', authorize(Permission.HOTEL_SALES_VIEW), HotelContractController.getAvailability);
router.put('/:id', authorize(Permission.HOTEL_SALES_UPDATE), HotelContractController.update);
router.patch('/:id', authorize(Permission.HOTEL_SALES_UPDATE), HotelContractController.update);
router.delete('/:id', authorize(Permission.HOTEL_SALES_DELETE), HotelContractController.remove);

export { router as hotelContractRouter };

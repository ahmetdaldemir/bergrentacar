import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { requireFeature } from '../../shared/middleware/feature-check.middleware';
import { HotelReservationController } from '../controllers/hotel-reservation.controller';

const router = Router();

router.use(authenticate);
router.use(requireFeature('hotel'));

router.get('/', authorize(Permission.HOTEL_SALES_VIEW), HotelReservationController.list);
router.post('/', authorize(Permission.HOTEL_SALES_CREATE), HotelReservationController.create);
router.get('/:id', authorize(Permission.HOTEL_SALES_VIEW), HotelReservationController.getById);
router.put('/:id', authorize(Permission.HOTEL_SALES_UPDATE), HotelReservationController.update);
router.patch('/:id', authorize(Permission.HOTEL_SALES_UPDATE), HotelReservationController.update);
router.post('/:id/cancel', authorize(Permission.HOTEL_SALES_UPDATE), HotelReservationController.cancel);
router.delete('/:id', authorize(Permission.HOTEL_SALES_DELETE), HotelReservationController.remove);

export { router as hotelReservationRouter };

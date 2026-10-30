import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { requireFeature } from '../../shared/middleware/feature-check.middleware';
import { FlightReservationController } from '../controllers/flight-reservation.controller';

const router = Router();

router.use(authenticate);
router.use(requireFeature('flight'));

router.get('/', authorize(Permission.FLIGHT_SALES_VIEW), FlightReservationController.list);
router.post('/', authorize(Permission.FLIGHT_SALES_CREATE), FlightReservationController.create);
router.get('/:id', authorize(Permission.FLIGHT_SALES_VIEW), FlightReservationController.getById);
router.put('/:id', authorize(Permission.FLIGHT_SALES_UPDATE), FlightReservationController.update);
router.patch('/:id', authorize(Permission.FLIGHT_SALES_UPDATE), FlightReservationController.update);
router.post('/:id/cancel', authorize(Permission.FLIGHT_SALES_UPDATE), FlightReservationController.cancel);
router.delete('/:id', authorize(Permission.FLIGHT_SALES_DELETE), FlightReservationController.remove);

export { router as flightReservationRouter };

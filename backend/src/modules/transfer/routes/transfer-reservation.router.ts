import { Router } from 'express';
import { TransferReservationController } from '../controllers/transfer-reservation.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/search', TransferReservationController.search); // Must be before /:id
router.get('/', TransferReservationController.list);
router.get('/reference/:reference', TransferReservationController.getByReference);
router.get('/:id/eta', TransferReservationController.getEta);
router.get('/:id/vehicle-tracking', TransferReservationController.getVehicleTracking);
router.get('/:id', TransferReservationController.getById);
router.post('/', TransferReservationController.create);
router.put('/:id/assign-vehicle', TransferReservationController.assignVehicle);
router.post('/:id/confirm-driver-cash', TransferReservationController.confirmDriverCash);
router.post('/:id/confirm-driver-payment', TransferReservationController.confirmDriverPayment);
router.post('/:id/stripe-payment-intent', TransferReservationController.createStripePaymentIntent);
router.post('/:id/stripe-payment-complete', TransferReservationController.completeStripePayment);
router.post('/:id/redirect-vehicle', TransferReservationController.redirectVehicle);
router.put('/:id', TransferReservationController.update);
router.put('/:id/status', TransferReservationController.updateStatus);
router.put('/:id/assign-driver', TransferReservationController.assignDriver);
router.delete('/:id', TransferReservationController.delete);

export { router as transferReservationRouter };


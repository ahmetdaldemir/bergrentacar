import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller';
import { ReservationTrafficFineController } from '../controllers/reservation-traffic-fine.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// Literal path first — otherwise GET /reservations/aggregated is matched by GET /:id and "aggregated" used as UUID
router.get('/aggregated', authenticate, authorize(Permission.RESERVATION_VIEW), ReservationController.listAggregated);

// Public routes (müşteri tarafından kullanılacak - authenticate middleware'den önce)
router.post('/:id/approve', ReservationController.approveByCustomer);
router.post('/:id/cancel-by-customer', ReservationController.cancelByCustomer);
// Public: rezervasyon detayı (tenantId query param ile doğrulama yapılır, auth gerekmez)
router.get('/:id/public', ReservationController.getByIdPublic);
router.get('/:id', ReservationController.getByIdPublic);

// Authenticated routes
router.use(authenticate);
router.get('/', authorize(Permission.RESERVATION_VIEW), ReservationController.list);
router.get('/:id/contract-print', authorize(Permission.RESERVATION_VIEW), ReservationController.contractPrint);
router.get('/:id/contract-thermal', authorize(Permission.RESERVATION_VIEW), ReservationController.contractThermalPdf);
router.get('/:id/voucher-pdf', authorize(Permission.RESERVATION_VIEW), ReservationController.voucherPdf);
router.get('/:id/traffic-fines', authorize(Permission.RESERVATION_VIEW), ReservationTrafficFineController.list);
router.post('/:id/traffic-fines', authorize(Permission.RESERVATION_UPDATE), ReservationTrafficFineController.create);
router.put('/:id/traffic-fines/:fineId', authorize(Permission.RESERVATION_UPDATE), ReservationTrafficFineController.update);
router.delete('/:id/traffic-fines/:fineId', authorize(Permission.RESERVATION_UPDATE), ReservationTrafficFineController.remove);
router.delete('/:id', authorize(Permission.RESERVATION_DELETE), ReservationController.delete);
router.post('/:id/confirm-staff-payment', authorize(Permission.RESERVATION_UPDATE), ReservationController.confirmStaffPayment);
router.post('/:id/stripe-payment-intent', authorize(Permission.RESERVATION_UPDATE), ReservationController.createReservationStripePaymentIntent);
router.post('/:id/stripe-payment-complete', authorize(Permission.RESERVATION_UPDATE), ReservationController.completeReservationStripePayment);
router.put('/:id/status', authorize(Permission.RESERVATION_UPDATE), ReservationController.updateStatus);
router.put('/:id', authorize(Permission.RESERVATION_UPDATE), ReservationController.update);
router.post('/:id/notes', authorize(Permission.RESERVATION_UPDATE), ReservationController.addNote);
router.post('/:id/checkout', authorize(Permission.RESERVATION_UPDATE), ReservationController.processCheckout);
router.post('/:id/checkin', authorize(Permission.RESERVATION_UPDATE), ReservationController.processCheckin);
router.post('/:id/cancel', authorize(Permission.RESERVATION_UPDATE), ReservationController.cancel);
router.post('/:id/send-confirmation-email', authorize(Permission.RESERVATION_UPDATE), ReservationController.sendConfirmationEmail);
router.post('/:id/send-cancellation-email', authorize(Permission.RESERVATION_UPDATE), ReservationController.sendCancellationEmail);

export default router;


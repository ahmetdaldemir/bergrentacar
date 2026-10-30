import { Router } from 'express';
import { ReservationLogController } from '../controllers/reservation-log.controller';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/', authorize(Permission.RESERVATION_VIEW), ReservationLogController.list);
router.get('/:id', authorize(Permission.RESERVATION_VIEW), ReservationLogController.getById);
router.post('/:id/convert', authorize(Permission.RESERVATION_CREATE), ReservationLogController.convertToReservation);

export default router;


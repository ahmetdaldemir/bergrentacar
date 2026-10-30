import { Router } from 'express';
import { TripsController } from '../controllers/trips.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/active', authorize(Permission.RESERVATION_VIEW), TripsController.getActiveTrips);
router.get('/today', authorize(Permission.RESERVATION_VIEW), TripsController.getTodayTrips);
router.get('/stats', authorize(Permission.RESERVATION_VIEW), TripsController.getTripsStats);
router.get('/', authorize(Permission.RESERVATION_VIEW), TripsController.getTrips);

export default router;


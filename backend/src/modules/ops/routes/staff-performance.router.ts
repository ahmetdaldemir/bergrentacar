import { Router } from 'express';
import { StaffPerformanceController } from '../controllers/staff-performance.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();
router.use(authenticate);

router.get('/my-scores', authorize(Permission.RESERVATION_VIEW), StaffPerformanceController.getMyScores);
router.get('/tenant-scores', authorize(Permission.RESERVATION_VIEW), StaffPerformanceController.getTenantScores);
router.get('/user/:userId/score', authorize(Permission.RESERVATION_VIEW), StaffPerformanceController.getUserScoreDetails);
router.post('/recalculate', authorize(Permission.RESERVATION_UPDATE), StaffPerformanceController.recalculateScores);

export default router;


import { Router } from 'express';
import { ActivityLogController } from '../controllers/activity-log.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List activity logs (admin only)
router.get(
  '/',
  authorize(Permission.ADMIN_VIEW), // Adjust permission based on your system
  ActivityLogController.list
);

// Get statistics (admin only)
router.get(
  '/stats',
  authorize(Permission.ADMIN_VIEW),
  ActivityLogController.getStats
);

// Manual cleanup trigger (super-admin only)
router.post(
  '/cleanup',
  authorize(Permission.ADMIN_VIEW), // Using ADMIN_VIEW since ADMIN_MANAGE doesn't exist
  ActivityLogController.cleanup
);

// Get single log by ID (admin only)
router.get(
  '/:id',
  authorize(Permission.ADMIN_VIEW),
  ActivityLogController.getById
);

export default router;


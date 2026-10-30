import { Router } from 'express';
import { OperationsController } from '../controllers/operations.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { upload } from '../../shared/controllers/file-upload.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Mobil inspection foto yükleme (multipart — /pickup/:id rotasından önce)
router.post(
  '/media/upload',
  authorize(Permission.RESERVATION_UPDATE),
  upload.single('file'),
  OperationsController.uploadInspectionMedia
);

// Get operations by date
router.get(
  '/',
  authorize(Permission.RESERVATION_VIEW),
  OperationsController.getOperations
);

// Pickup endpoints
router.get(
  '/pickup/:reservationId',
  authorize(Permission.RESERVATION_VIEW),
  OperationsController.getPickup
);

router.post(
  '/pickup/:reservationId/draft',
  authorize(Permission.RESERVATION_UPDATE),
  OperationsController.savePickupDraft
);

router.post(
  '/pickup/:reservationId/complete',
  authorize(Permission.RESERVATION_UPDATE),
  OperationsController.completePickup
);

// Return endpoints
router.get(
  '/return/:reservationId',
  authorize(Permission.RESERVATION_VIEW),
  OperationsController.getReturn
);

router.post(
  '/return/:reservationId/draft',
  authorize(Permission.RESERVATION_UPDATE),
  OperationsController.saveReturnDraft
);

router.post(
  '/return/:reservationId/complete',
  authorize(Permission.RESERVATION_UPDATE),
  OperationsController.completeReturn
);

// Damage compare endpoint
router.get(
  '/damage-compare/:reservationId',
  authorize(Permission.RESERVATION_VIEW),
  OperationsController.getDamageCompare
);

export default router;


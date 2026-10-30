import { Router } from 'express';
import { TourController } from '../controllers/tour.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { requireFeature } from '../../shared/middleware/feature-check.middleware';

const router = Router();

// Public read endpoints (used by tenant public sites — no auth required)
router.get('/', TourController.list);
router.get('/:id', TourController.getById);

// Protected endpoints — tenant must be authenticated and have the tour module enabled
router.use(authenticate);
router.use(requireFeature('tour'));
router.post('/', authorize(Permission.TOUR_CREATE), TourController.create);
router.put('/:id', authorize(Permission.TOUR_UPDATE), TourController.update);
router.patch('/:id', authorize(Permission.TOUR_UPDATE), TourController.update);
router.delete('/:id', authorize(Permission.TOUR_DELETE), TourController.remove);

export default router;

import { Router } from 'express';
import { TourFeatureController } from '../controllers/tour-feature.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { requireFeature } from '../../shared/middleware/feature-check.middleware';

const router = Router();

router.use(authenticate);
router.use(requireFeature('tour'));
router.get('/', authorize(Permission.TOUR_VIEW), TourFeatureController.list);
router.get('/:id', authorize(Permission.TOUR_VIEW), TourFeatureController.getById);
router.post('/', authorize(Permission.TOUR_CREATE), TourFeatureController.create);
router.put('/:id', authorize(Permission.TOUR_UPDATE), TourFeatureController.update);
router.patch('/:id', authorize(Permission.TOUR_UPDATE), TourFeatureController.update);
router.delete('/:id', authorize(Permission.TOUR_DELETE), TourFeatureController.remove);

export default router;

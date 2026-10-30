import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { requireFeature } from '../../shared/middleware/feature-check.middleware';
import { FlightSalesSettingsController } from '../controllers/flight-sales-settings.controller';

const router = Router();

router.use(authenticate);
router.use(requireFeature('flight'));

router.get('/', authorize(Permission.SETTINGS_VIEW), FlightSalesSettingsController.get);
router.put('/', authorize(Permission.SETTINGS_UPDATE), FlightSalesSettingsController.update);

export { router as flightSalesSettingsRouter };

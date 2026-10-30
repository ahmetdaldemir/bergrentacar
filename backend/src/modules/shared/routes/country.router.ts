import { Router } from 'express';
import { CountryController } from '../controllers/country.controller';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// Public routes - no authentication required
router.get('/', CountryController.list);
router.get('/site/list', CountryController.listForSite);
router.get('/code/:code', CountryController.getByCode);
router.get('/slug/:slug', CountryController.getBySlug);

// All other routes require authentication
router.use(authenticate);
router.get('/:id', authorize(Permission.SETTINGS_VIEW), CountryController.getById);
router.post('/', authorize(Permission.SETTINGS_UPDATE), CountryController.create);
router.put('/:id', authorize(Permission.SETTINGS_UPDATE), CountryController.update);
router.delete('/:id', authorize(Permission.SETTINGS_UPDATE), CountryController.delete);
router.patch('/:id/toggle-active', authorize(Permission.SETTINGS_UPDATE), CountryController.toggleActive);
router.post('/sync', authorize(Permission.SETTINGS_UPDATE), CountryController.sync);

export default router;


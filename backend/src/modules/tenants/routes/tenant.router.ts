import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

// Public: GET /api/tenants?tenantId={id} — returns a single tenant's info only
router.get('/', TenantController.getByQuery);

// Protected routes — require authentication
router.use(authenticate);
router.post('/', TenantController.create);
router.get('/:id', TenantController.getById);
router.put('/:id', TenantController.update);
router.patch('/:id/default-currency', TenantController.updateDefaultCurrency);

export default router;

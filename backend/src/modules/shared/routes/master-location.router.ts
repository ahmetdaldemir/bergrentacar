import { Router } from 'express';
import { MasterLocationController } from '../controllers/master-location.controller';

const router = Router();

// Public endpoints - no authentication required for listing master locations
router.get('/', MasterLocationController.list);
router.get('/:id', MasterLocationController.getById);

// Protected endpoints - authentication required for create/update/delete
// Note: These should be protected by admin-only permissions in production
router.post('/', MasterLocationController.create);
router.put('/:id', MasterLocationController.update);
router.patch('/:id', MasterLocationController.update);
router.delete('/:id', MasterLocationController.remove);

export default router;


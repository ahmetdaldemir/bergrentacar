import { Router } from 'express';
import { TransferRequestController } from '../controllers/transfer-request.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

// Public — web sitesinden talep oluşturma (auth gerekmez)
router.post('/public', TransferRequestController.createPublic);

// Admin — auth gerekli
router.use(authenticate);

router.get('/', TransferRequestController.list);
router.get('/:id', TransferRequestController.getById);
router.patch('/:id/status', TransferRequestController.updateStatus);
router.delete('/:id', TransferRequestController.delete);

export { router as transferRequestRouter };

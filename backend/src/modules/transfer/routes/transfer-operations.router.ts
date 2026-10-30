import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { TransferOperationsController } from '../controllers/transfer-operations.controller';

const router = Router();

router.use(authenticate);

router.get('/availability', TransferOperationsController.availability);

export { router as transferOperationsRouter };

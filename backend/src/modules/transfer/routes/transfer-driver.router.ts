import { Router } from 'express';
import { TransferDriverController } from '../controllers/transfer-driver.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', TransferDriverController.list);
router.get('/:id', TransferDriverController.getById);
router.post('/', TransferDriverController.create);
router.put('/:id', TransferDriverController.update);
router.delete('/:id', TransferDriverController.delete);

export { router as transferDriverRouter };


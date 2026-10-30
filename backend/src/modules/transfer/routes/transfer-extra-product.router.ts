import { Router } from 'express';
import { TransferExtraProductController } from '../controllers/transfer-extra-product.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

// Public — web sitesinde ekstra ürünleri göstermek için (auth gerekmez)
router.get('/public', TransferExtraProductController.listPublic);

// Admin — authenticate zorunlu
router.use(authenticate);

router.get('/', authorize(Permission.TRANSFER_VIEW), TransferExtraProductController.list);
router.get('/:id', authorize(Permission.TRANSFER_VIEW), TransferExtraProductController.getById);
router.post('/', authorize(Permission.TRANSFER_CREATE), TransferExtraProductController.create);
router.put('/:id', authorize(Permission.TRANSFER_UPDATE), TransferExtraProductController.update);
router.delete('/:id', authorize(Permission.TRANSFER_DELETE), TransferExtraProductController.remove);

export { router as transferExtraProductRouter };

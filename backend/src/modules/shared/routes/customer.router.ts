import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/', authorize(Permission.CUSTOMER_VIEW), CustomerController.list);
router.get('/:id', authorize(Permission.CUSTOMER_VIEW), CustomerController.getById);
router.post('/', authorize(Permission.CUSTOMER_CREATE), CustomerController.create);
router.put('/:id', authorize(Permission.CUSTOMER_UPDATE), CustomerController.update);
router.post('/:id/change-password', authorize(Permission.CUSTOMER_UPDATE), CustomerController.changePassword);
router.delete('/:id', authorize(Permission.CUSTOMER_DELETE), CustomerController.remove);

export default router;


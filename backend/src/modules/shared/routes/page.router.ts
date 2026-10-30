import { Router } from 'express';
import { PageController } from '../controllers/page.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.use(authenticate);
router.get('/', authorize(Permission.PAGE_VIEW), PageController.list);
router.get('/:id', authorize(Permission.PAGE_VIEW), PageController.getById);
router.post('/', authorize(Permission.PAGE_CREATE), PageController.create);
router.put('/:id', authorize(Permission.PAGE_UPDATE), PageController.update);
router.delete('/:id', authorize(Permission.PAGE_DELETE), PageController.remove);

export default router;


import { Router } from 'express';
import { LanguageController } from '../controllers/language.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.get('/', LanguageController.list);
router.post('/', authenticate, authorize(Permission.LANGUAGE_CREATE), LanguageController.create);
router.patch('/:id', authenticate, authorize(Permission.LANGUAGE_UPDATE), LanguageController.update);
router.post('/:id/set-default', authenticate, authorize(Permission.LANGUAGE_UPDATE), LanguageController.setDefault);
router.delete('/:id', authenticate, authorize(Permission.LANGUAGE_DELETE), LanguageController.remove);

export default router;

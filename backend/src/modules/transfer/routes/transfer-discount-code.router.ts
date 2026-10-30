import { Router } from 'express';
import {
  TransferDiscountCodeController,
  validateRateLimiter,
} from '../controllers/transfer-discount-code.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

// ─── Public router: sadece tenant sitelerinden (api/) ────────────────────────
// SaaS kullanıcılarının web sitelerinden gelen istekler: validate, redeem, by-email.

const publicRouter = Router();
publicRouter.get('/validate', validateRateLimiter, TransferDiscountCodeController.validate);
publicRouter.post('/redeem', validateRateLimiter, TransferDiscountCodeController.redeem);
publicRouter.get('/by-email', validateRateLimiter, TransferDiscountCodeController.listByCustomerEmail);

// ─── Full router: admin panel (internal_api/) ────────────────────────────────
// Public route'lar + authenticate sonrası admin CRUD.

const router = Router();
router.get('/validate', validateRateLimiter, TransferDiscountCodeController.validate);
router.post('/redeem', validateRateLimiter, TransferDiscountCodeController.redeem);
router.get('/by-email', validateRateLimiter, TransferDiscountCodeController.listByCustomerEmail);

router.use(authenticate);
router.get('/', authorize(Permission.DISCOUNT_CODE_VIEW), TransferDiscountCodeController.list);
router.get('/code/:code', authorize(Permission.DISCOUNT_CODE_VIEW), TransferDiscountCodeController.getByCode);
router.get('/:id', authorize(Permission.DISCOUNT_CODE_VIEW), TransferDiscountCodeController.getById);
router.get('/:id/usages', authorize(Permission.DISCOUNT_CODE_VIEW), TransferDiscountCodeController.usages);
router.post('/', authorize(Permission.DISCOUNT_CODE_CREATE), TransferDiscountCodeController.create);
router.patch('/:id/cancel', authorize(Permission.DISCOUNT_CODE_UPDATE), TransferDiscountCodeController.cancel);
router.delete('/:id', authorize(Permission.DISCOUNT_CODE_DELETE), TransferDiscountCodeController.remove);

export { publicRouter as transferDiscountCodePublicRouter };
export { router as transferDiscountCodeRouter };

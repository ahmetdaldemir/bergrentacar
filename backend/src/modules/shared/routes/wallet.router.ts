import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Tutarlı path: /wallet/customers/:customerId (frontend /internal_api/wallet/customers/:id ile uyumlu)
router.get('/customers/:customerId', authorize(Permission.CUSTOMER_VIEW), WalletController.getWallet);
router.get('/customers/:customerId/transactions', authorize(Permission.CUSTOMER_VIEW), WalletController.getTransactions);
router.post('/customers/:customerId/credit', authorize(Permission.CUSTOMER_UPDATE), WalletController.creditPoints);
router.post('/customers/:customerId/debit', authorize(Permission.CUSTOMER_UPDATE), WalletController.debitPoints);
router.post('/customers/:customerId/adjust', authorize(Permission.CUSTOMER_UPDATE), WalletController.adjustWallet);

export default router;


import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { FinanceCategoryController } from '../controllers/finance-category.controller';
import { FinanceCariController } from '../controllers/finance-cari.controller';
import { FinanceTransactionController } from '../controllers/finance-transaction.controller';
import { FinanceCheckController } from '../controllers/finance-check.controller';
import { FinanceLoanController } from '../controllers/finance-loan.controller';
import { FinanceLoanInstallmentController } from '../controllers/finance-loan-installment.controller';
import { FinanceReportController } from '../controllers/finance-report.controller';

const router = Router();

router.use(authenticate);

// Categories
router.get('/categories', authorize(Permission.FINANCE_VIEW), FinanceCategoryController.list);
router.get('/categories/:id', authorize(Permission.FINANCE_VIEW), FinanceCategoryController.getById);
router.post('/categories', authorize(Permission.FINANCE_CREATE), FinanceCategoryController.create);
router.patch('/categories/:id', authorize(Permission.FINANCE_UPDATE), FinanceCategoryController.update);
router.delete('/categories/:id', authorize(Permission.FINANCE_DELETE), FinanceCategoryController.remove);

// Cari
router.get('/cari', authorize(Permission.FINANCE_VIEW), FinanceCariController.list);
router.get('/cari/by-email', authorize(Permission.FINANCE_VIEW), FinanceCariController.getByEmail);
router.get('/cari/:id/balance', authorize(Permission.FINANCE_VIEW), FinanceCariController.getBalance);
router.get('/cari/:id', authorize(Permission.FINANCE_VIEW), FinanceCariController.getById);
router.post('/cari', authorize(Permission.FINANCE_CREATE), FinanceCariController.create);
router.patch('/cari/:id', authorize(Permission.FINANCE_UPDATE), FinanceCariController.update);
router.delete('/cari/:id', authorize(Permission.FINANCE_DELETE), FinanceCariController.remove);

// Transactions
router.get('/transactions', authorize(Permission.FINANCE_VIEW), FinanceTransactionController.list);
router.get('/transactions/by-reservation/:reservationId', authorize(Permission.FINANCE_VIEW), FinanceTransactionController.listByReservation);
router.get('/transactions/by-transfer-reservation/:transferReservationId', authorize(Permission.FINANCE_VIEW), FinanceTransactionController.listByTransferReservation);
router.get('/transactions/:id', authorize(Permission.FINANCE_VIEW), FinanceTransactionController.getById);
router.post('/transactions', authorize(Permission.FINANCE_CREATE), FinanceTransactionController.create);
router.patch('/transactions/:id', authorize(Permission.FINANCE_UPDATE), FinanceTransactionController.update);
router.delete('/transactions/:id', authorize(Permission.FINANCE_DELETE), FinanceTransactionController.remove);

// Checks
router.get('/checks', authorize(Permission.FINANCE_VIEW), FinanceCheckController.list);
router.get('/checks/:id', authorize(Permission.FINANCE_VIEW), FinanceCheckController.getById);
router.post('/checks', authorize(Permission.FINANCE_CREATE), FinanceCheckController.create);
router.patch('/checks/:id', authorize(Permission.FINANCE_UPDATE), FinanceCheckController.update);
router.post('/checks/:id/mark', authorize(Permission.FINANCE_UPDATE), FinanceCheckController.markStatus);
router.delete('/checks/:id', authorize(Permission.FINANCE_DELETE), FinanceCheckController.remove);

// Loans
router.get('/loans', authorize(Permission.FINANCE_VIEW), FinanceLoanController.list);
router.get('/loans/:id', authorize(Permission.FINANCE_VIEW), FinanceLoanController.getById);
router.post('/loans', authorize(Permission.FINANCE_CREATE), FinanceLoanController.create);
router.patch('/loans/:id', authorize(Permission.FINANCE_UPDATE), FinanceLoanController.update);
router.post('/loans/:id/close', authorize(Permission.FINANCE_UPDATE), FinanceLoanController.close);
router.post('/loans/:id/regenerate-installments', authorize(Permission.FINANCE_UPDATE), FinanceLoanController.regenerateInstallments);
router.delete('/loans/:id', authorize(Permission.FINANCE_DELETE), FinanceLoanController.remove);

// Loan Installments
router.get('/loan-installments', authorize(Permission.FINANCE_VIEW), FinanceLoanInstallmentController.list);
router.get('/loan-installments/:id', authorize(Permission.FINANCE_VIEW), FinanceLoanInstallmentController.getById);
router.post('/loan-installments/:id/pay', authorize(Permission.FINANCE_UPDATE), FinanceLoanInstallmentController.pay);
router.post('/loan-installments/:id/cancel', authorize(Permission.FINANCE_UPDATE), FinanceLoanInstallmentController.cancel);

// Reports
router.get('/reports/summary', authorize(Permission.FINANCE_VIEW), FinanceReportController.summary);

export default router;


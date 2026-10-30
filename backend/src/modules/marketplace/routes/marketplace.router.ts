import { Router } from 'express';
import { MarketplaceController } from '../controllers/marketplace.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

router.post('/listings', authenticate, authorize(Permission.RESERVATION_UPDATE), MarketplaceController.createListing);
router.get('/listings', authenticate, authorize(Permission.RESERVATION_VIEW), MarketplaceController.listListings);
router.get('/listings/:id', authenticate, authorize(Permission.RESERVATION_VIEW), MarketplaceController.getListing);
router.put('/listings/:id', authenticate, authorize(Permission.RESERVATION_UPDATE), MarketplaceController.updateListing);
router.delete('/listings/:id', authenticate, authorize(Permission.RESERVATION_UPDATE), MarketplaceController.deleteListing);
router.post('/listings/:id/approve', authenticate, authorize(Permission.RESERVATION_UPDATE), MarketplaceController.approveListing);

router.post('/agreements', authenticate, authorize(Permission.RESERVATION_UPDATE), MarketplaceController.createAgreement);
router.get('/agreements', authenticate, authorize(Permission.RESERVATION_VIEW), MarketplaceController.listAgreements);
router.get('/agreements/:id', authenticate, authorize(Permission.RESERVATION_VIEW), MarketplaceController.getAgreement);
router.post('/agreements/:id/approve', authenticate, authorize(Permission.RESERVATION_UPDATE), MarketplaceController.approveAgreement);
router.post('/agreements/:id/suspend', authenticate, authorize(Permission.RESERVATION_UPDATE), MarketplaceController.suspendAgreement);
router.post('/agreements/:id/terminate', authenticate, authorize(Permission.RESERVATION_UPDATE), MarketplaceController.terminateAgreement);

router.post('/commission/calculate', authenticate, authorize(Permission.RESERVATION_VIEW), MarketplaceController.calculateCommission);
router.post('/commission/transactions', authenticate, authorize(Permission.RESERVATION_UPDATE), MarketplaceController.createTransaction);
router.get('/commission/transactions', authenticate, authorize(Permission.RESERVATION_VIEW), MarketplaceController.listTransactions);
router.get('/commission/summary', authenticate, authorize(Permission.RESERVATION_VIEW), MarketplaceController.getCommissionSummary);

export default router;


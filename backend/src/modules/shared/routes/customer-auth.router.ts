import { Router } from 'express';
import { CustomerAuthController } from '../controllers/customer-auth.controller';
import { customerAuthenticate } from '../middleware/customer-auth.middleware';

const router = Router();

// Public routes (no authentication required)
router.post('/login', CustomerAuthController.login);
router.post('/forgot-password', CustomerAuthController.forgotPassword);
router.post('/reset-password', CustomerAuthController.resetPassword);

// Protected routes (customer authentication required)
router.get('/me', customerAuthenticate, CustomerAuthController.me);
router.get('/reservations', customerAuthenticate, CustomerAuthController.myReservations);
router.post('/change-password', customerAuthenticate, CustomerAuthController.changePassword);
router.post('/logout', customerAuthenticate, CustomerAuthController.logout);

export default router;


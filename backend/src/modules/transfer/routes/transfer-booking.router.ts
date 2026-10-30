import { Router } from 'express';
import { TransferBookingController } from '../controllers/transfer-booking.controller';

const router = Router();

// Public booking endpoints (no authentication required)

// Search available vehicles with pricing
router.post('/search', TransferBookingController.searchVehicles);

// Create reservation
router.post('/create', TransferBookingController.createReservation);

export { router as transferBookingRouter };

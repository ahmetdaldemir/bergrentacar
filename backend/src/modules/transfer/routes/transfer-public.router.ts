import { Router } from 'express';
import { TransferPublicController } from '../controllers/transfer-public.controller';

const router = Router();

// All routes are public - no authentication required

// Tüm fiyatlandırma verileri (tenantId'ye göre)
router.get('/pricings', TransferPublicController.getAllPricings);

// Search available transfers (routes + vehicles + pricing)
router.get('/search', TransferPublicController.searchTransfers);

// Get available routes
router.get('/routes', TransferPublicController.getAvailableRoutes);

// Get pickup and dropoff locations (for site display)
router.get('/locations', TransferPublicController.getTransferLocations);

// Get available vehicles for a route
router.get('/vehicles', TransferPublicController.getAvailableVehicles);

// Calculate price
router.post('/calculate-price', TransferPublicController.calculatePrice);

// Create reservation (public booking)
router.post('/reservations', TransferPublicController.createReservation);

// Get reservation by reference
router.get('/reservations/:reference', TransferPublicController.getReservationByReference);

export { router as transferPublicRouter };

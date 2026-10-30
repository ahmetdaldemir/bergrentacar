import { Router } from 'express';
import { TransferGoogleMapsController } from '../controllers/google-maps.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// General autocomplete
router.post('/autocomplete', TransferGoogleMapsController.autocomplete);

// Place details
router.post('/place-details', TransferGoogleMapsController.placeDetails);

// Calculate distance
router.post('/calculate-distance', TransferGoogleMapsController.calculateDistance);

// Specific searches
router.post('/search-airports', TransferGoogleMapsController.searchAirports);
router.post('/search-hotels', TransferGoogleMapsController.searchHotels);

export { router as transferGoogleMapsRouter };

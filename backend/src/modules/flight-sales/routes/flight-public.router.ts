import { Router } from 'express';
import { FlightPublicController } from '../controllers/flight-public.controller';

const router = Router();

router.get('/module', FlightPublicController.getModule);
router.post('/search', FlightPublicController.search);

export { router as flightPublicRouter };

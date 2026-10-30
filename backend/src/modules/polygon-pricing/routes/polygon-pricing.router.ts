import { Router } from 'express';
import { PolygonPricingController } from '../controllers/polygon-pricing.controller';

const router = Router();

/**
 * Admin / internal routes (intended to be mounted under internal_api by integrator)
 */
router.get('/zones', PolygonPricingController.listZones);
router.get('/zones/:id', PolygonPricingController.getZone);
router.post('/zones', PolygonPricingController.createZone);
router.put('/zones/:id', PolygonPricingController.updateZone);
router.delete('/zones/:id', PolygonPricingController.deleteZone);

router.get('/zone-prices', PolygonPricingController.listPrices);
router.post('/zone-prices', PolygonPricingController.setPrice);

/**
 * Public/test route (intended to be mounted under /api by integrator)
 */
router.post('/quote', PolygonPricingController.quote);

export default router;



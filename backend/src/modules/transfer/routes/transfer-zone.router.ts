import { Router } from 'express';
import { TransferZoneController } from '../controllers/transfer-zone.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';

const router = Router();

// Public Quote API (no token required for /api requests)
router.post('/zone-quote', TransferZoneController.quote);

// Public: tenant_settings.google_maps_api_key (kolon boşsa key yok; env fallback yok)
router.get('/maps-config', async (req: any, res: any) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.json({ key: null });
    }
    const key = await TenantSettingsService.getGoogleMapsApiKey(tenantId);
    return res.json({ key: key || null });
  } catch {
    return res.json({ key: null });
  }
});

// All other routes require authentication
router.use(authenticate);

// Zone Management
router.get('/zones', TransferZoneController.listZones);
router.get('/zones/:id', TransferZoneController.getZone);
router.post('/zones', TransferZoneController.createZone);
router.put('/zones/:id', TransferZoneController.updateZone);
router.delete('/zones/:id', TransferZoneController.deleteZone);

// Zone Price Management
router.get('/zone-prices', TransferZoneController.listPrices);
router.post('/zone-prices', TransferZoneController.setPrice);
router.put('/zone-prices/:id', TransferZoneController.updatePrice);
router.delete('/zone-prices/:id', TransferZoneController.deletePrice);

// Note: quote route registered above as public

export { router as transferZoneRouter };


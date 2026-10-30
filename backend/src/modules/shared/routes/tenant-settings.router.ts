import { Router } from 'express';
import { TenantSettingsController } from '../controllers/tenant-settings.controller';
import { TenantWhatsAppIntegrationController } from '../controllers/tenant-whatsapp-integration.controller';
import { FileUploadController, upload } from '../controllers/file-upload.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { publicApiResponseCache } from '../../../middleware/api-public-response-cache.middleware';

const router = Router();

router.post('/upload', authenticate, authorize(Permission.SETTINGS_UPDATE), upload.single('file'), FileUploadController.uploadFile);

router.get(
  '/whatsapp',
  authenticate,
  authorize(Permission.SETTINGS_VIEW),
  TenantWhatsAppIntegrationController.get,
);
router.put(
  '/whatsapp',
  authenticate,
  authorize(Permission.SETTINGS_UPDATE),
  TenantWhatsAppIntegrationController.update,
);

// Public GET endpoints - no authentication required, tenantId from query parameter
router.get('/', TenantSettingsController.getAll);
router.get(
  '/site',
  publicApiResponseCache({ routeKey: 'settings:site', queryKeys: ['tenantId'], requireTenant: true }),
  TenantSettingsController.getSite,
);
router.get('/mail', TenantSettingsController.getMail);
router.get('/payment', TenantSettingsController.getPayment);
router.get('/ai', TenantSettingsController.getAi);
router.get('/invoice', TenantSettingsController.getInvoice);
router.get('/features', TenantSettingsController.getFeatures);
router.get('/features/me', authenticate, TenantSettingsController.getFeaturesAuthenticated);
router.get('/translations', TenantSettingsController.getTranslations);

// Protected PUT endpoints - authentication and authorization required
router.use(authenticate);
router.put('/site', authorize(Permission.SETTINGS_UPDATE), TenantSettingsController.updateSite);
router.post('/cache/clear', authorize(Permission.SETTINGS_UPDATE), TenantSettingsController.clearPublicApiCache);
router.put('/mail', authorize(Permission.SETTINGS_UPDATE), TenantSettingsController.updateMail);
router.put('/payment', authorize(Permission.SETTINGS_UPDATE), TenantSettingsController.updatePayment);
router.put('/ai', authorize(Permission.SETTINGS_UPDATE), TenantSettingsController.updateAi);
router.put('/invoice', authorize(Permission.SETTINGS_UPDATE), TenantSettingsController.updateInvoice);
router.put('/translations', authorize(Permission.SETTINGS_UPDATE), TenantSettingsController.putTranslations);

export default router;


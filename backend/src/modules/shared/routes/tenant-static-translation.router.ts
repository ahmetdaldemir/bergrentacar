import { Router } from 'express';
import { TenantStaticTranslationController } from '../controllers/tenant-static-translation.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';

const router = Router();

/**
 * Public: web sitesi tenant bazlı çevirileri dil koduna göre çeker.
 * GET /api/settings/static-translations/export?tenantId=xxx&lang=en
 */
router.get('/export', TenantStaticTranslationController.exportPublic);

// Korumalı: Panel CRUD işlemleri
router.use(authenticate);

/**
 * GET /settings/static-translations?namespace=header
 * Tüm anahtarları ve dil değerlerini listeler.
 */
router.get('/', authorize(Permission.SETTINGS_VIEW), TenantStaticTranslationController.list);

/**
 * POST /settings/static-translations
 * Yeni anahtar ekle.
 */
router.post('/', authorize(Permission.SETTINGS_UPDATE), TenantStaticTranslationController.create);

/**
 * POST /settings/static-translations/import
 * Varsayılan dil JSON dosyasını içe aktarır, anahtarları oluşturur/günceller.
 */
router.post('/import', authorize(Permission.SETTINGS_UPDATE), TenantStaticTranslationController.importJson);

/**
 * PUT /settings/static-translations/bulk-language
 * Bir dil için toplu değer güncelleme.
 */
router.put('/bulk-language', authorize(Permission.SETTINGS_UPDATE), TenantStaticTranslationController.bulkUpdateLanguage);

/**
 * PUT /settings/static-translations/:key
 * Bir anahtarın tüm dil değerlerini güncelle.
 */
router.put('/:key', authorize(Permission.SETTINGS_UPDATE), TenantStaticTranslationController.update);

/**
 * DELETE /settings/static-translations/:key
 * Anahtarı sil.
 */
router.delete('/:key', authorize(Permission.SETTINGS_UPDATE), TenantStaticTranslationController.deleteKey);

export { router as tenantStaticTranslationRouter };

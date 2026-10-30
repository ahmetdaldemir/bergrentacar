import { Express } from 'express';
import tenantRouter from '../modules/tenants/routes/tenant.router';
import tourRouter from '../modules/tour/routes/tour.router';
import tourFeatureRouter from '../modules/tour/routes/tour-feature.router';
import rentacarRouter from '../modules/rentacar/routes/rentacar.router';
import vehicleCategoryRouter from '../modules/rentacar/routes/vehicle-category.router';
import vehicleBrandRouter from '../modules/rentacar/routes/vehicle-brand.router';
import vehicleModelRouter from '../modules/rentacar/routes/vehicle-model.router';
import locationRouter from '../modules/rentacar/routes/location.router';
import locationPricingRouter from '../modules/rentacar/routes/location-pricing.router';
import locationDeliveryPricingRouter from '../modules/rentacar/routes/location-delivery-pricing.router';
import extraRouter from '../modules/rentacar/routes/extra.router';
import authRouter from '../modules/auth/routes/auth.router';
import languageRouter from '../modules/shared/routes/language.router';
import destinationRouter from '../modules/shared/routes/destination.router';
import hotelRouter from '../modules/shared/routes/hotel.router';
import blogRouter from '../modules/shared/routes/blog.router';
import pageRouter from '../modules/shared/routes/page.router';
import translationRouter from '../modules/shared/routes/translation.router';
import currencyRouter from '../modules/shared/routes/currency.router';
import masterLocationRouter from '../modules/shared/routes/master-location.router';
import tenantSettingsRouter from '../modules/shared/routes/tenant-settings.router';
import customerRouter from '../modules/shared/routes/customer.router';
import surveyRouter from '../modules/shared/routes/survey.router';
import reservationRouter from '../modules/shared/routes/reservation.router';
import reservationLogRouter from '../modules/shared/routes/reservation-log.router';
import monitoringRouter from '../modules/admin/routes/monitoring.router';
import tenantMonitoringRouter from '../modules/admin/routes/tenant-monitoring.router';
import emailTemplateRouter from '../modules/shared/routes/email-template.router';
import mailRouter from '../modules/shared/routes/mail.router';
import countryRouter from '../modules/shared/routes/country.router';
import financeRouter from '../modules/finance/routes/finance.router';
import tenantUserRouter from '../modules/tenants/routes/tenant-user.router';
import tenantMessageRouter from '../modules/tenants/routes/tenant-message.router';
import { tenantLanguageRouter } from '../modules/tenants/routes/tenant-language.router';
import { transferVehicleRouter } from '../modules/transfer/routes/transfer-vehicle.router';
import { transferPricingRouter } from '../modules/transfer/routes/transfer-pricing.router';
import { transferPopularRouteRouter } from '../modules/transfer/routes/transfer-popular-route.router';
import { transferReservationRouter } from '../modules/transfer/routes/transfer-reservation.router';
import { transferOperationsRouter } from '../modules/transfer/routes/transfer-operations.router';
import { transferDriverRouter } from '../modules/transfer/routes/transfer-driver.router';
import { transferPublicRouter } from '../modules/transfer/routes/transfer-public.router';
import { transferGoogleMapsRouter } from '../modules/transfer/routes/google-maps.router';
import { transferBookingRouter } from '../modules/transfer/routes/transfer-booking.router';
import { transferVehicleFeatureRouter } from '../modules/transfer/routes/transfer-vehicle-feature.router';
import { transferRequestRouter } from '../modules/transfer/routes/transfer-request.router';
import { transferExtraProductRouter } from '../modules/transfer/routes/transfer-extra-product.router';
import {
  transferDiscountCodePublicRouter,
  transferDiscountCodeRouter,
} from '../modules/transfer/routes/transfer-discount-code.router';
import { transferZoneRouter } from '../modules/transfer/routes/transfer-zone.router';
import aiJobRouter from '../modules/shared/routes/ai-job.router';
import docsRouter from './docs.router';
import chatRouter from '../modules/chat/routes/chat.router';
import chatWidgetRouter from '../modules/chat/routes/chat-widget.router';
import opsTaskRouter from '../modules/ops/routes/ops-task.router';
import staffPerformanceRouter from '../modules/ops/routes/staff-performance.router';
import crmPageCategoryRouter from '../modules/crm/routes/crm-page-category.router';
import crmPageRouter from '../modules/crm/routes/crm-page.router';
import adminAuthRouter from '../modules/admin/routes/admin-auth.router';
import marketplaceRouter from '../modules/marketplace/routes/marketplace.router';
import walletRouter from '../modules/shared/routes/wallet.router';
import invoiceRouter from '../modules/shared/routes/invoice.router';
import customerAuthRouter from '../modules/shared/routes/customer-auth.router';
import activityLogRouter from '../modules/activity-log/routes/activity-log.router';
import backupRouter from '../modules/admin/routes/backup.router';
import couponRouter from '../modules/shared/routes/coupon.router';
import polygonPricingRouter from '../modules/polygon-pricing/routes/polygon-pricing.router';
import operationsRouter from '../modules/rentacar/routes/operations.router';
import { tenantStaticTranslationRouter } from '../modules/shared/routes/tenant-static-translation.router';
import demoRequestRouter from './demo-request.router';
import { tenantHotelRouter } from '../modules/hotel-sales/routes/tenant-hotel.router';
import { hotelContractRouter } from '../modules/hotel-sales/routes/hotel-contract.router';
import { hotelReservationRouter } from '../modules/hotel-sales/routes/hotel-reservation.router';
import { flightPublicRouter } from '../modules/flight-sales/routes/flight-public.router';
import { flightReservationRouter } from '../modules/flight-sales/routes/flight-reservation.router';
import { flightSalesSettingsRouter } from '../modules/flight-sales/routes/flight-sales-settings.router';

export const registerRoutes = (app: Express) => {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Public API routes
  // NOTE: /api endpoints are intentionally public — bypass CIDR/IP restrictions here.
  // Make sure route-level auth is enforced where needed.
  app.use('/api', (_req, _res, next) => next());
  app.use('/api', docsRouter);
 
  // Public widget routes (no auth required, validated via publicKey)
  app.use('/api/chat/widget', chatWidgetRouter);

  app.use('/api/auth', authRouter);
  app.use('/api/customers/auth', customerAuthRouter);
  /** api-routes.ts / widget: `/api` öneki olmadan müşteri auth (CORS + doğru rota) */
  app.use('/customers/auth', customerAuthRouter);
  app.use('/api/languages', languageRouter);
  app.use('/api/destinations', destinationRouter);
  app.use('/api/hotels', hotelRouter);
  app.use('/api/blogs', blogRouter);
  app.use('/api/pages', pageRouter);
  app.use('/api/tenants', tenantRouter);
  app.use('/api/tenant-users', tenantUserRouter);
  app.use('/api/tenant-messages', tenantMessageRouter);
  app.use('/api/tenant-languages', tenantLanguageRouter);
  app.use('/api/tours', tourRouter);
  app.use('/api/tour-features', tourFeatureRouter);
  // Register more specific routes FIRST to avoid route matching conflicts
  app.use('/api/rentacar/locations', locationRouter);
  app.use('/api/rentacar/location-pricing', locationPricingRouter);
  app.use('/api/rentacar/location-delivery-pricing', locationDeliveryPricingRouter);
  // vehicle-categories kaldırıldı — public site için categories, /api/rentacar/vehicles/search içinde geliyor
  app.use('/api/rentacar/vehicle-brands', vehicleBrandRouter);
  app.use('/api/rentacar/vehicle-models', vehicleModelRouter);
  app.use('/api/rentacar/extras', extraRouter);
  // Register general rentacar routes AFTER specific routes
  app.use('/api/rentacar', rentacarRouter);
  // Also register at root level for convenience
  // vehicle-categories kaldırıldı — public site için /api/rentacar/vehicles/search kullanın
  app.use('/api/vehicle-brands', vehicleBrandRouter);
  app.use('/api/vehicle-models', vehicleModelRouter);
  app.use('/api/translation', translationRouter);
  app.use('/api/currencies', currencyRouter);
  app.use('/api/settings/currencies', currencyRouter); // Alias for Vue frontend compatibility
  app.use('/api/countries', countryRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/master-locations', masterLocationRouter);
  app.use('/api/settings', tenantSettingsRouter);
  app.use('/api/settings/static-translations', tenantStaticTranslationRouter);
  app.use('/api/demo-request', demoRequestRouter);
  app.use('/api/hotel-sales/hotels', tenantHotelRouter);
  app.use('/api/hotel-sales/contracts', hotelContractRouter);
  app.use('/api/hotel-sales/reservations', hotelReservationRouter);
  app.use('/api/flight-sales/public', flightPublicRouter);
  app.use('/api/flight-sales/reservations', flightReservationRouter);
  app.use('/api/flight-sales/settings', flightSalesSettingsRouter);
  app.use('/api/crm/customers', customerRouter);
  app.use('/api/crm/page-categories', crmPageCategoryRouter);
  app.use('/api/crm/pages', crmPageRouter);
  app.use('/api/surveys', surveyRouter);
  app.use('/api/reservations', reservationRouter);
  app.use('/api/reservation-logs', reservationLogRouter);
  app.use('/api/email-templates', emailTemplateRouter);
  app.use('/api/mail', mailRouter);
  // Transfer public endpoints (no auth required) - must be registered BEFORE authenticated routes
  app.use('/api/transfer/public', transferPublicRouter);
  app.use('/api/transfer/booking', transferBookingRouter); // Public booking with Google Maps
  // Transfer requests (public create + admin CRUD)
  app.use('/api/transfer/requests', transferRequestRouter);
  // Transfer extra products (multi-language, public list + admin CRUD)
  app.use('/api/transfer/extra-products', transferExtraProductRouter);
  // Global discount codes — api/ = tenant siteleri (validate, redeem, by-email)
  app.use('/api/discount-codes', transferDiscountCodePublicRouter);
  // Transfer authenticated endpoints
  app.use('/api/transfer/vehicles', transferVehicleRouter);
  // Note: Route management has been disabled - routes should be managed via database/migrations
  // app.use('/api/transfer/routes', transferRouteRouter);
  app.use('/api/transfer/pricings', transferPricingRouter);
  app.use('/api/transfer/popular-routes', transferPopularRouteRouter);
  app.use('/api/transfer/reservations', transferReservationRouter);
  app.use('/api/transfer/operations', transferOperationsRouter);
  app.use('/api/transfer/drivers', transferDriverRouter);
  app.use('/api/transfer/vehicle-features', transferVehicleFeatureRouter);
  app.use('/api/transfer/maps', transferGoogleMapsRouter);
  app.use('/api/transfer', transferZoneRouter); // Zone management
  app.use('/api/ai', aiJobRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/ops/tasks', opsTaskRouter);
  app.use('/api/ops/performance', staffPerformanceRouter);
  app.use('/api/admin/monitoring', monitoringRouter);
  app.use('/api/admin', tenantMonitoringRouter);
  app.use('/api/admin/auth', adminAuthRouter);
  app.use('/api/admin/activity-logs', activityLogRouter);
  app.use('/api/backups', backupRouter); // Backup download - public
  app.use('/api/admin/backups', backupRouter); // Backup management - authenticated
  app.use('/api/marketplace', marketplaceRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/invoices', invoiceRouter);
  app.use('/api/coupons', couponRouter);
  app.use('/api/rentacar/operations', operationsRouter);

  // Restrict internal_api to allowed IPs (INTERNAL_API_ALLOWED_IPS).
  // Default: allow all (*). Set comma-separated IPs in production to lock down.
  const rawAllowed = (process.env.INTERNAL_API_ALLOWED_IPS ?? '*').trim();
  const skipIpCheck = rawAllowed === '*' || rawAllowed.toLowerCase() === 'all';
  const allowedInternalIps = skipIpCheck
    ? []
    : rawAllowed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  app.use('/internal_api', (req, res, next) => {
    if (skipIpCheck) return next();

    // Allow service token header as a bypass for trusted proxies/panels.
    const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
    const providedToken =
      (req.headers['x-service-token'] as string) ||
      (req.headers['x-service-token'.toLowerCase()] as string);
    if (serviceToken && providedToken && providedToken === serviceToken) {
      return next();
    }

    const xff = (req.headers['x-forwarded-for'] as string) || '';
    const remote =
      xff.split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || req.ip;
    const ip = (remote || '').replace(/^::ffff:/, '');
    if (allowedInternalIps.includes(ip)) return next();
    res.status(403).json({ success: false, message: 'Forbidden' });
  });

  // Internal API mounts (for panel/internal usage only).
  // Panel should call /internal_api/* and network should ensure only trusted hosts reach this.
  app.use('/internal_api', docsRouter);
  app.use('/internal_api/chat/widget', chatWidgetRouter);
  app.use('/internal_api/auth', authRouter);
  app.use('/internal_api/customers/auth', customerAuthRouter);
  app.use('/internal_api/languages', languageRouter);
  app.use('/internal_api/destinations', destinationRouter);
  app.use('/internal_api/hotels', hotelRouter);
  app.use('/internal_api/blogs', blogRouter);
  app.use('/internal_api/pages', pageRouter);
  app.use('/internal_api/tenants', tenantRouter);
  app.use('/internal_api/tenant-users', tenantUserRouter);
  app.use('/internal_api/tenant-messages', tenantMessageRouter);
  app.use('/internal_api/tenant-languages', tenantLanguageRouter);
  app.use('/internal_api/tours', tourRouter);
  app.use('/internal_api/tour-features', tourFeatureRouter);
  app.use('/internal_api/rentacar/locations', locationRouter);
  app.use('/internal_api/rentacar/location-pricing', locationPricingRouter);
  app.use('/internal_api/rentacar/location-delivery-pricing', locationDeliveryPricingRouter);
  app.use('/internal_api/rentacar/vehicle-categories', vehicleCategoryRouter);
  app.use('/internal_api/rentacar/vehicle-brands', vehicleBrandRouter);
  app.use('/internal_api/rentacar/vehicle-models', vehicleModelRouter);
  app.use('/internal_api/rentacar/extras', extraRouter);
  app.use('/internal_api/rentacar', rentacarRouter);
  app.use('/internal_api/vehicle-categories', vehicleCategoryRouter);
  app.use('/internal_api/vehicle-brands', vehicleBrandRouter);
  app.use('/internal_api/vehicle-models', vehicleModelRouter);
  app.use('/internal_api/translation', translationRouter);
  app.use('/internal_api/currencies', currencyRouter);
  app.use('/internal_api/settings/currencies', currencyRouter);
  app.use('/internal_api/countries', countryRouter);
  app.use('/internal_api/finance', financeRouter);
  app.use('/internal_api/master-locations', masterLocationRouter);
  app.use('/internal_api/settings', tenantSettingsRouter);
  app.use('/internal_api/settings/static-translations', tenantStaticTranslationRouter);
  app.use('/internal_api/hotel-sales/hotels', tenantHotelRouter);
  app.use('/internal_api/hotel-sales/contracts', hotelContractRouter);
  app.use('/internal_api/hotel-sales/reservations', hotelReservationRouter);
  app.use('/internal_api/flight-sales/public', flightPublicRouter);
  app.use('/internal_api/flight-sales/reservations', flightReservationRouter);
  app.use('/internal_api/flight-sales/settings', flightSalesSettingsRouter);
  app.use('/internal_api/wallet', walletRouter);
  app.use('/internal_api/crm/customers', customerRouter);
  app.use('/internal_api/crm/page-categories', crmPageCategoryRouter);
  app.use('/internal_api/crm/pages', crmPageRouter);
  app.use('/internal_api/surveys', surveyRouter);
  app.use('/internal_api/reservations', reservationRouter);
  app.use('/internal_api/reservation-logs', reservationLogRouter);
  app.use('/internal_api/email-templates', emailTemplateRouter);
  app.use('/internal_api/mail', mailRouter);
  app.use('/internal_api/transfer/public', transferPublicRouter);
  app.use('/internal_api/transfer/booking', transferBookingRouter);
  app.use('/internal_api/transfer/requests', transferRequestRouter);
  app.use('/internal_api/transfer/extra-products', transferExtraProductRouter);
  app.use('/internal_api/discount-codes', transferDiscountCodeRouter);
  app.use('/internal_api/transfer/vehicles', transferVehicleRouter);
  app.use('/internal_api/transfer/pricings', transferPricingRouter);
  app.use('/internal_api/transfer/popular-routes', transferPopularRouteRouter);
  app.use('/internal_api/transfer/reservations', transferReservationRouter);
  app.use('/internal_api/transfer/operations', transferOperationsRouter);
  app.use('/internal_api/transfer/drivers', transferDriverRouter);
  app.use('/internal_api/transfer/vehicle-features', transferVehicleFeatureRouter);
  app.use('/internal_api/transfer/maps', transferGoogleMapsRouter);
  app.use('/internal_api/transfer', transferZoneRouter); // Zone management
  app.use('/internal_api/ai', aiJobRouter);
  app.use('/internal_api/chat', chatRouter);
  app.use('/internal_api/ops/tasks', opsTaskRouter);
  app.use('/internal_api/ops/performance', staffPerformanceRouter);
  app.use('/internal_api/admin/monitoring', monitoringRouter);
  app.use('/internal_api/admin', tenantMonitoringRouter);
  app.use('/internal_api/admin/auth', adminAuthRouter);
  app.use('/internal_api/admin/activity-logs', activityLogRouter);
  app.use('/internal_api/backups', backupRouter);
  app.use('/internal_api/coupons', couponRouter);
  app.use('/internal_api/rentacar/operations', operationsRouter);
  app.use('/internal_api/polygon-pricing', polygonPricingRouter);

  // Handle /tracking/* requests (redirect to correct endpoint to avoid 404 spam)
  // This is a compatibility route for any legacy clients or misconfigured proxies
  app.get('/tracking/:plate/info', (req, res) => {
    const { plate } = req.params;
    // Return 404 with helpful message instead of redirect to avoid infinite loops
    res.status(404).json({ 
      message: 'Endpoint not found. Use /api/rentacar/tracking/:plate/info instead.',
      correctPath: `/api/rentacar/tracking/${plate}/info`
    });
  });
  
  app.get('/tracking/:plate', (req, res) => {
    const { plate } = req.params;
    res.status(404).json({ 
      message: 'Endpoint not found. Use /api/rentacar/tracking/:plate instead.',
      correctPath: `/api/rentacar/tracking/${plate}`
    });
  });
};

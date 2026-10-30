import { Router } from 'express';
import operationsRouter from './operations.router';
import { RentacarController } from '../controllers/rentacar.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { authorize } from '../../auth/middleware/authorize.middleware';
import { Permission } from '../../auth/permissions';
import { upload } from '../../shared/controllers/file-upload.controller';
import tripsRouter from './trips.router';
import { VehicleTrackingController } from '../controllers/vehicle-tracking.controller';
import { VehicleTimelineController } from '../controllers/vehicle-timeline.controller';
import { VehicleDamageDetectionController } from '../controllers/vehicle-damage-detection.controller';
import { ContractController } from '../controllers/contract.controller';
import { PricingIntelligenceController } from '../controllers/pricing-intelligence.controller';
import { CampaignController } from '../controllers/campaign.controller';

const router = Router();

// Public endpoint - no authentication required, tenantId from query parameter
router.get('/vehicles', RentacarController.listVehicles);
// Public - Sitede kampanya göstermek için (tenantId query param)
router.get('/campaigns/public', CampaignController.listPublic);
// IMPORTANT: /vehicles/search must be before /vehicles/:id to avoid route matching conflict
router.get('/vehicles/search', RentacarController.searchVehicles);
/** Harici siteler — kampanya / widget (fiyata göre sıralı liste) */
router.get('/public/promo-vehicles', RentacarController.promoVehicles);
/** Tenant tüm araçlar + N günlük fiyat; lokasyon opsiyonel (varsayılan ilk aktif lokasyon) */
router.get('/public/tenant-weekly-prices', RentacarController.tenantWeeklyPrices);
// Public endpoint - rentacar reservation creation
router.post('/reservations', RentacarController.createReservation);
// Public endpoint - rentacar reservation creation
router.post('/reservations', RentacarController.createReservation);

// Protected endpoints - authentication and authorization required
router.use(authenticate);
// List vehicle plates (requires authentication)
router.get('/plates', RentacarController.listPlates);
router.get('/plates/calendar', authorize(Permission.RESERVATION_VIEW), RentacarController.getPlateCalendar);
// Vehicle timeline (must be before /vehicles/:id to avoid route conflict)
router.get('/vehicles/:id/timeline', authorize(Permission.VEHICLE_VIEW), VehicleTimelineController.getTimeline);
router.get('/vehicles/:id', RentacarController.getVehicle);
router.post('/vehicles', authorize(Permission.VEHICLE_CREATE), RentacarController.createVehicle);
router.put('/vehicles/:id', authorize(Permission.VEHICLE_UPDATE), RentacarController.updateVehicle);
router.patch('/vehicles/:id', authorize(Permission.VEHICLE_UPDATE), RentacarController.updateVehicle);
router.delete('/vehicles/:id', authorize(Permission.VEHICLE_DELETE), RentacarController.deleteVehicle);
router.post('/vehicles/:vehicleId/plates', authorize(Permission.VEHICLE_UPDATE), RentacarController.addPlate);
router.put('/vehicles/:vehicleId/plates/:plateId', authorize(Permission.VEHICLE_UPDATE), RentacarController.updatePlate);
router.patch('/vehicles/:vehicleId/plates/:plateId', authorize(Permission.VEHICLE_UPDATE), RentacarController.updatePlate);
router.delete('/vehicles/:vehicleId/plates/:plateId', authorize(Permission.VEHICLE_UPDATE), RentacarController.deletePlate);
router.post('/vehicles/:vehicleId/pricing', authorize(Permission.VEHICLE_UPDATE), RentacarController.upsertPricing);
router.put('/vehicles/:id/last-return-location', authorize(Permission.VEHICLE_UPDATE), RentacarController.updateLastReturnLocation);
router.patch('/vehicles/:id/last-return-location', authorize(Permission.VEHICLE_UPDATE), RentacarController.updateLastReturnLocation);
// Notifications must be before /:id routes to avoid conflict
router.get('/reservations/notifications', authorize(Permission.RESERVATION_VIEW), RentacarController.getNotifications);
router.post('/reservations/:reservationId/assignments', authorize(Permission.RESERVATION_UPDATE), RentacarController.assignPlate);
router.post('/reservations/:reservationId/extend', authorize(Permission.RESERVATION_UPDATE), RentacarController.extendReservation);
router.post('/reservations/:id/approve', authorize(Permission.RESERVATION_UPDATE), RentacarController.approveReservation);
router.post('/reservations/:id/reject', authorize(Permission.RESERVATION_UPDATE), RentacarController.rejectReservation);
router.post('/reservations/:id/cancel', authorize(Permission.RESERVATION_UPDATE), RentacarController.cancelReservation);
router.get('/vehicles/:vehicleId/images', authenticate, authorize(Permission.VEHICLE_VIEW), RentacarController.listVehicleImages);
router.post('/vehicles/:vehicleId/images', authenticate, authorize(Permission.VEHICLE_UPDATE), upload.single('file'), RentacarController.uploadVehicleImage);
router.put('/vehicles/:vehicleId/images/:imageId', authenticate, authorize(Permission.VEHICLE_UPDATE), RentacarController.updateVehicleImage);
router.delete('/vehicles/:vehicleId/images/:imageId', authenticate, authorize(Permission.VEHICLE_UPDATE), RentacarController.deleteVehicleImage);
router.post('/vehicles/:vehicleId/images/reorder', authenticate, authorize(Permission.VEHICLE_UPDATE), RentacarController.reorderVehicleImages);

// Trips routes
router.use('/trips', tripsRouter);

// Operations routes
router.use('/operations', operationsRouter);

// Vehicle tracking routes
router.get('/tracking/providers', authenticate, VehicleTrackingController.listProviders);
router.get('/tracking/:plate', authenticate, authorize(Permission.VEHICLE_VIEW), VehicleTrackingController.getVehicleLocation);
router.get('/tracking/:plate/info', authenticate, authorize(Permission.VEHICLE_VIEW), VehicleTrackingController.getVehicleTrackingInfo);
router.post('/tracking/batch', authenticate, authorize(Permission.VEHICLE_VIEW), VehicleTrackingController.getMultipleVehicleLocations);

// Vehicle damage detection routes
router.post('/vehicles/:vehicleId/reservations/:reservationId/damage-detection', authenticate, authorize(Permission.VEHICLE_VIEW), VehicleDamageDetectionController.processDetection);
router.get('/damage-detections/:id', authenticate, authorize(Permission.VEHICLE_VIEW), VehicleDamageDetectionController.getById);
router.get('/vehicles/:vehicleId/damage-detections', authenticate, authorize(Permission.VEHICLE_VIEW), VehicleDamageDetectionController.getByVehicle);
router.get('/reservations/:reservationId/damage-detection', authenticate, authorize(Permission.VEHICLE_VIEW), VehicleDamageDetectionController.getByReservation);
router.post('/damage-detections/:id/verify', authenticate, authorize(Permission.VEHICLE_UPDATE), VehicleDamageDetectionController.verifyDetection);

// Contract routes
router.get('/contracts/templates/default', authenticate, authorize(Permission.RESERVATION_VIEW), ContractController.getDefaultTemplate);
router.get('/contracts/templates', authenticate, authorize(Permission.RESERVATION_VIEW), ContractController.listTemplates);
router.get('/contracts/templates/:id', authenticate, authorize(Permission.RESERVATION_VIEW), ContractController.getTemplate);
router.get('/contracts/templates/:id/print-preview', authenticate, authorize(Permission.RESERVATION_VIEW), ContractController.printTemplatePreview);
router.post('/contracts/templates', authenticate, authorize(Permission.RESERVATION_UPDATE), ContractController.createTemplate);
router.put('/contracts/templates/:id', authenticate, authorize(Permission.RESERVATION_UPDATE), ContractController.updateTemplate);
router.delete('/contracts/templates/:id', authenticate, authorize(Permission.RESERVATION_UPDATE), ContractController.deleteTemplate);
router.post('/contracts/preview', authenticate, authorize(Permission.RESERVATION_VIEW), ContractController.previewContract);
router.get('/contracts', authenticate, authorize(Permission.RESERVATION_VIEW), ContractController.listContracts);
router.get('/contracts/:id', authenticate, authorize(Permission.RESERVATION_VIEW), ContractController.getContract);
router.post('/contracts', authenticate, authorize(Permission.RESERVATION_UPDATE), ContractController.createContract);
router.put('/contracts/:id', authenticate, authorize(Permission.RESERVATION_UPDATE), ContractController.updateContract);
router.post('/contracts/:id/sign', authenticate, authorize(Permission.RESERVATION_UPDATE), ContractController.signContract);
router.post('/contracts/:id/generate-pdf', authenticate, authorize(Permission.RESERVATION_VIEW), ContractController.generatePDF);
router.post('/contracts/:id/generate-thermal-pdf', authenticate, authorize(Permission.RESERVATION_VIEW), ContractController.generateThermalPDF);
router.delete('/contracts/:id', authenticate, authorize(Permission.RESERVATION_UPDATE), ContractController.deleteContract);

// Pricing Intelligence routes
router.post('/pricing-intelligence/analyze', authenticate, authorize(Permission.VEHICLE_VIEW), PricingIntelligenceController.analyze);
router.get('/pricing-intelligence/dashboard', authenticate, authorize(Permission.VEHICLE_VIEW), PricingIntelligenceController.getDashboard);
router.get('/pricing-intelligence/insights', authenticate, authorize(Permission.VEHICLE_VIEW), PricingIntelligenceController.listInsights);
router.post('/pricing-intelligence/insights/:id/acknowledge', authenticate, authorize(Permission.VEHICLE_UPDATE), PricingIntelligenceController.acknowledgeInsight);
router.post('/pricing-intelligence/insights/:id/dismiss', authenticate, authorize(Permission.VEHICLE_UPDATE), PricingIntelligenceController.dismissInsight);
router.get('/pricing-intelligence/rules/default', authenticate, authorize(Permission.VEHICLE_VIEW), PricingIntelligenceController.getDefaultRule);

// Campaign routes
router.get('/campaigns', authenticate, authorize(Permission.VEHICLE_VIEW), CampaignController.list);
router.get('/campaigns/:id', authenticate, authorize(Permission.VEHICLE_VIEW), CampaignController.getById);
router.post('/campaigns', authenticate, authorize(Permission.VEHICLE_UPDATE), CampaignController.create);
router.put('/campaigns/:id', authenticate, authorize(Permission.VEHICLE_UPDATE), CampaignController.update);
router.delete('/campaigns/:id', authenticate, authorize(Permission.VEHICLE_UPDATE), CampaignController.delete);
router.post('/campaigns/check-applicable', authenticate, authorize(Permission.VEHICLE_VIEW), CampaignController.checkApplicable);
router.post('/campaigns/quote', authenticate, authorize(Permission.VEHICLE_VIEW), CampaignController.getQuote);

export default router;

import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, ValidationError } from '../../../utils/errors';
import { TenantFeaturesService } from '../../shared/services/tenant-features.service';
import { FlightSalesSettingsService } from '../services/flight-sales-settings.service';
import { GtcFlightClient } from '../integrations/gtc/gtc-flight-client';

/**
 * Genel (tenantId query) uçuş modülü ve arama uçları — web sitesi / widget için.
 */
export class FlightPublicController {
  static getModule = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const featureOn = await TenantFeaturesService.hasFeature(tenantId, 'flight');
    const settings = await FlightSalesSettingsService.getPublic(tenantId);
    sendSuccess(res, {
      featureEnabled: featureOn,
      salesEnabled: settings.enabled,
      provider: settings.provider,
      searchAvailable: featureOn && settings.enabled && settings.provider === 'gtc',
    });
  });

  /**
   * GTC yapılandırılmışsa istemci üzerinden arama; aksi halde boş teklif + bilgi mesajı.
   */
  static search = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const featureOn = await TenantFeaturesService.hasFeature(tenantId, 'flight');
    if (!featureOn) throw new ValidationError('flight module is not enabled for this tenant');

    const settings = await FlightSalesSettingsService.getPublic(tenantId);
    if (!settings.enabled) throw new ValidationError('flight sales is disabled');

    const body = req.body as Record<string, unknown>;
    const originAirportCode = String(body.originAirportCode || '').trim();
    const destinationAirportCode = String(body.destinationAirportCode || '').trim();
    const departureDate = String(body.departureDate || '').trim();
    const tripType = (body.tripType as string) === 'round_trip' ? 'round_trip' : 'one_way';
    const returnDate = body.returnDate ? String(body.returnDate).trim() : undefined;

    if (!originAirportCode || !destinationAirportCode || !departureDate) {
      throw new ValidationError('originAirportCode, destinationAirportCode, departureDate are required');
    }

    const cfg = await FlightSalesSettingsService.getGtcConfigForIntegration(tenantId);
    if (!cfg) {
      sendSuccess(res, {
        provider: settings.provider,
        offers: [],
        message: 'Uçuş sağlayıcısı yapılandırılmamış veya GTC bilgileri eksik.',
      });
      return;
    }

    const client = new GtcFlightClient(cfg);
    const result = await client.search({
      originAirportCode: originAirportCode.toUpperCase(),
      destinationAirportCode: destinationAirportCode.toUpperCase(),
      departureDate,
      returnDate: tripType === 'round_trip' ? returnDate : undefined,
      tripType,
      adultCount: Math.max(1, Number(body.adultCount) || 1),
      childCount: Math.max(0, Number(body.childCount) || 0),
      infantCount: Math.max(0, Number(body.infantCount) || 0),
    });

    sendSuccess(res, result);
  });
}

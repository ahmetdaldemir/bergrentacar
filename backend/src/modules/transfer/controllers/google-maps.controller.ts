import { Response } from 'express';
import { GoogleMapsService } from '../../../services/google-maps.service';
import { asyncHandler, UnauthorizedError } from '../../../utils/errors';
import type { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';

/**
 * Google Maps Controller for Transfer Module
 * 
 * Endpoints:
 * - POST /api/transfer/maps/autocomplete - Search places
 * - POST /api/transfer/maps/place-details - Get place details
 * - POST /api/transfer/maps/calculate-distance - Calculate distance between two locations
 */
export class TransferGoogleMapsController {
  /**
   * Autocomplete places search
   * POST /api/transfer/maps/autocomplete
   * 
   * Body:
   * {
   *   input: string,
   *   types?: ['airport', 'hotel', 'establishment'],
   *   language?: 'tr',
   *   country?: 'tr'
   * }
   */
  static autocomplete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { input, types, language, country } = req.body;

    if (!input || input.length < 2) {
      return res.status(400).json({ 
        message: 'Input must be at least 2 characters' 
      });
    }

    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedError('Tenant context required for Google Maps');
    }
    const mapsKey = await TenantSettingsService.requireGoogleMapsApiKey(tenantId);

    const options: any = { language, apiKey: mapsKey };
    
    if (types && Array.isArray(types)) {
      options.types = types;
    }

    if (country) {
      options.components = `country:${country}`;
    }

    const results = await GoogleMapsService.autocomplete(input, options);

    res.json({
      success: true,
      count: results.length,
      results,
    });
  });

  /**
   * Get place details
   * POST /api/transfer/maps/place-details
   * 
   * Body:
   * {
   *   placeId: string,
   *   language?: 'tr'
   * }
   */
  static placeDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { placeId, language } = req.body;

    if (!placeId) {
      return res.status(400).json({ message: 'placeId is required' });
    }

    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedError('Tenant context required for Google Maps');
    }
    const mapsKey = await TenantSettingsService.requireGoogleMapsApiKey(tenantId);
    const details = await GoogleMapsService.getPlaceDetails(placeId, { language, apiKey: mapsKey });

    res.json({
      success: true,
      place: details,
    });
  });

  /**
   * Calculate distance between pickup and dropoff
   * POST /api/transfer/maps/calculate-distance
   * 
   * Body:
   * {
   *   origin: string | { lat: number, lng: number },
   *   destination: string | { lat: number, lng: number },
   *   mode?: 'driving' | 'walking',
   *   language?: 'tr'
   * }
   */
  static calculateDistance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { origin, destination, mode, language } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ 
        message: 'origin and destination are required' 
      });
    }

    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedError('Tenant context required for Google Maps');
    }
    const mapsKey = await TenantSettingsService.requireGoogleMapsApiKey(tenantId);
    const result = await GoogleMapsService.calculateDistance(
      origin,
      destination,
      { mode, language, apiKey: mapsKey }
    );

    res.json({
      success: true,
      distance: result,
      distanceKm: Math.round(result.distanceMeters / 1000),
    });
  });

  /**
   * Search airports specifically
   * POST /api/transfer/maps/search-airports
   */
  static searchAirports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { input, language, country } = req.body;

    if (!input || input.length < 2) {
      return res.status(400).json({ 
        message: 'Input must be at least 2 characters' 
      });
    }

    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedError('Tenant context required for Google Maps');
    }
    const mapsKey = await TenantSettingsService.requireGoogleMapsApiKey(tenantId);
    const results = await GoogleMapsService.autocomplete(input, {
      types: ['airport'],
      language,
      components: country ? `country:${country}` : undefined,
      apiKey: mapsKey,
    });

    res.json({
      success: true,
      count: results.length,
      results,
    });
  });

  /**
   * Search hotels specifically
   * POST /api/transfer/maps/search-hotels
   */
  static searchHotels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { input, language, country } = req.body;

    if (!input || input.length < 2) {
      return res.status(400).json({ 
        message: 'Input must be at least 2 characters' 
      });
    }

    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedError('Tenant context required for Google Maps');
    }
    const mapsKey = await TenantSettingsService.requireGoogleMapsApiKey(tenantId);
    const results = await GoogleMapsService.autocomplete(input, {
      types: ['lodging', 'hotel'],
      language,
      components: country ? `country:${country}` : undefined,
      apiKey: mapsKey,
    });

    res.json({
      success: true,
      count: results.length,
      results,
    });
  });
}

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { VehicleTrackingService } from '../services/vehicle-tracking.service';
import { asyncHandler } from '../../../utils/errors';

export class VehicleTrackingController {
  /**
   * Get vehicle location by plate
   * GET /api/rentacar/tracking/:plate
   */
  static getVehicleLocation = asyncHandler(
    async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
      if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant not found' });
      }

      const { plate } = req.params;
      if (!plate) {
        return res.status(400).json({ message: 'Plate number is required' });
      }

      const location = await VehicleTrackingService.getVehicleLocation(req.tenant.id, plate);
      
      if (!location) {
        return res.status(404).json({ message: 'Vehicle location not found or tracking not configured' });
      }

      res.json(location);
    }
  );

  /**
   * Get detailed vehicle tracking information
   * GET /api/rentacar/tracking/:plate/info
   */
  static getVehicleTrackingInfo = asyncHandler(
    async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
      if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant not found' });
      }

      const { plate } = req.params;
      if (!plate) {
        return res.status(400).json({ message: 'Plate number is required' });
      }

      const info = await VehicleTrackingService.getVehicleTrackingInfo(req.tenant.id, plate);
      
      if (!info) {
        return res.status(404).json({ message: 'Vehicle tracking info not found or tracking not configured' });
      }

      res.json(info);
    }
  );

  /**
   * Get multiple vehicle locations
   * POST /api/rentacar/tracking/batch
   * Body: { plates: string[] }
   */
  static getMultipleVehicleLocations = asyncHandler(
    async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
      if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant not found' });
      }

      const { plates } = req.body;
      if (!Array.isArray(plates) || plates.length === 0) {
        return res.status(400).json({ message: 'plates array is required' });
      }

      const locations = await VehicleTrackingService.getMultipleVehicleLocations(
        req.tenant.id,
        plates
      );

      // Convert Map to object
      const result: Record<string, any> = {};
      locations.forEach((location, plate) => {
        result[plate] = location;
      });

      res.json(result);
    }
  );

  /**
   * List available tracking providers
   * GET /api/rentacar/tracking/providers
   */
  static listProviders = asyncHandler(
    async (_req: AuthenticatedRequest & TenantRequest, res: Response) => {
      const providers = VehicleTrackingService.listProviders();
      res.json({ providers });
    }
  );
}


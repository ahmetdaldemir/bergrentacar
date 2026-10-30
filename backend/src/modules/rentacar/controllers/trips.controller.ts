import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { TripsService } from '../services/trips.service';
import { ReservationStatus } from '../../shared/entities/reservation.entity';
import { asyncHandler } from '../../../utils/errors';

export class TripsController {
  /**
   * Get active trips (checkIn exists but checkOut is null)
   * GET /api/rentacar/trips/active
   */
  static getActiveTrips = asyncHandler(
    async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
      if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant not found' });
      }

      const trips = await TripsService.getActiveTrips(req.tenant.id);
      res.json(trips);
    }
  );

  /**
   * Get trips by status
   * GET /api/rentacar/trips?status=completed
   */
  static getTrips = asyncHandler(
    async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
      if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant not found' });
      }

      const status = req.query.status as ReservationStatus | undefined;
      const trips = await TripsService.getTripsByStatus(req.tenant.id, status);
      res.json(trips);
    }
  );

  /**
   * Get today's trips
   * GET /api/rentacar/trips/today
   */
  static getTodayTrips = asyncHandler(
    async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
      if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant not found' });
      }

      const trips = await TripsService.getTodayTrips(req.tenant.id);
      res.json(trips);
    }
  );

  /**
   * Get trips statistics
   * GET /api/rentacar/trips/stats
   */
  static getTripsStats = asyncHandler(
    async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
      if (!req.tenant) {
        return res.status(400).json({ message: 'Tenant not found' });
      }

      const stats = await TripsService.getTripsStats(req.tenant.id);
      res.json(stats);
    }
  );
}


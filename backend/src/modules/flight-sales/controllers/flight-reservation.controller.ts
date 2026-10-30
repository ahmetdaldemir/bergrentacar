import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../../utils/errors';
import { getTenantIdFromAuth } from '../../../utils/validation';
import { FlightReservationService } from '../services/flight-reservation.service';
import { FlightPaymentStatus, FlightReservationStatus } from '../entities/flight-reservation.entity';

export class FlightReservationController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const { status, paymentStatus } = req.query;
    const rows = await FlightReservationService.list(tenantId, {
      status: status as FlightReservationStatus | undefined,
      paymentStatus: paymentStatus as FlightPaymentStatus | undefined,
    });
    sendSuccess(res, rows);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const row = await FlightReservationService.getById(req.params.id, tenantId);
    sendSuccess(res, row);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const row = await FlightReservationService.create({ ...req.body, tenantId });
    sendSuccess(res, row, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const row = await FlightReservationService.update(req.params.id, tenantId, req.body);
    sendSuccess(res, row);
  });

  static cancel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const row = await FlightReservationService.cancel(req.params.id, tenantId);
    sendSuccess(res, row);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    await FlightReservationService.remove(req.params.id, tenantId);
    res.status(204).send();
  });
}

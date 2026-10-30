import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { HotelReservationService } from '../services/hotel-reservation.service';
import { HotelReservationStatus, HotelPaymentStatus } from '../entities/hotel-reservation.entity';
import { asyncHandler, sendSuccess } from '../../../utils/errors';
import { getTenantIdFromAuth } from '../../../utils/validation';

export class HotelReservationController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const { hotelId, status, paymentStatus } = req.query;
    const reservations = await HotelReservationService.list(tenantId, {
      hotelId: hotelId as string | undefined,
      status: status as HotelReservationStatus | undefined,
      paymentStatus: paymentStatus as HotelPaymentStatus | undefined,
    });
    sendSuccess(res, reservations);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const reservation = await HotelReservationService.getById(req.params.id, tenantId);
    sendSuccess(res, reservation);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const reservation = await HotelReservationService.create({ ...req.body, tenantId });
    sendSuccess(res, reservation, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const reservation = await HotelReservationService.update(req.params.id, tenantId, req.body);
    sendSuccess(res, reservation);
  });

  static cancel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const reservation = await HotelReservationService.cancel(req.params.id, tenantId);
    sendSuccess(res, reservation);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    await HotelReservationService.remove(req.params.id, tenantId);
    res.status(204).send();
  });
}

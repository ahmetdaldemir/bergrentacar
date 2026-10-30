import { Response } from 'express';
import { ReservationLogService } from '../services/reservation-log.service';
import { ReservationLogStatus } from '../entities/reservation-log.entity';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError } from '../../../utils/errors';

export class ReservationLogController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const status = req.query.status as ReservationLogStatus | undefined;
    const logs = await ReservationLogService.list(tenantId, status);
    sendSuccess(res, logs);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const log = await ReservationLogService.getById(id, tenantId);
    if (!log) throw new NotFoundError('Reservation log', id);
    sendSuccess(res, log);
  });

  static convertToReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const reservation = await ReservationLogService.convertToReservation(id, tenantId);
    sendSuccess(res, { message: 'Reservation created from log', reservation });
  });
}

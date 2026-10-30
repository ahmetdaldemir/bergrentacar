import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, NotFoundError } from '../../../utils/errors';
import { validateId } from '../../../utils/validation';
import { ReservationTrafficFineService } from '../services/reservation-traffic-fine.service';
import { ReservationService } from '../services/reservation.service';

async function resolveTenantIdForReservation(
  req: AuthenticatedRequest,
  reservationId: string,
): Promise<string> {
  let tenantId = req.auth?.tenantId;
  if (tenantId) return tenantId;
  const reservation = await ReservationService.getById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation', reservationId);
  return reservation.tenantId;
}

export class ReservationTrafficFineController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reservationId = validateId('id', req.params.id)!;
    const tenantId = await resolveTenantIdForReservation(req, reservationId);
    const items = await ReservationTrafficFineService.listForReservation(tenantId, reservationId);
    sendSuccess(res, items);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reservationId = validateId('id', req.params.id)!;
    const tenantId = await resolveTenantIdForReservation(req, reservationId);
    const body = req.body as Record<string, unknown>;
    const fineDate = typeof body.fineDate === 'string' ? body.fineDate : '';
    const amount = body.amount != null ? Number(body.amount) : NaN;
    const currencyCode = typeof body.currencyCode === 'string' ? body.currencyCode : undefined;
    const paid = body.paid === true || body.paid === 'true';
    const description = typeof body.description === 'string' ? body.description : undefined;
    const row = await ReservationTrafficFineService.create(tenantId, reservationId, {
      fineDate,
      amount,
      currencyCode,
      paid,
      description,
    });
    sendSuccess(res, row);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reservationId = validateId('id', req.params.id)!;
    const tenantId = await resolveTenantIdForReservation(req, reservationId);
    const fineId = validateId('fineId', req.params.fineId)!;
    const body = req.body as Record<string, unknown>;
    const patch: Parameters<typeof ReservationTrafficFineService.update>[3] = {};
    if (body.fineDate !== undefined) patch.fineDate = String(body.fineDate);
    if (body.amount !== undefined) patch.amount = Number(body.amount);
    if (body.currencyCode !== undefined) patch.currencyCode = String(body.currencyCode);
    if (body.paid !== undefined) patch.paid = body.paid === true || body.paid === 'true';
    if (body.description !== undefined) patch.description = body.description === null ? null : String(body.description);
    const row = await ReservationTrafficFineService.update(tenantId, reservationId, fineId, patch);
    sendSuccess(res, row);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reservationId = validateId('id', req.params.id)!;
    const tenantId = await resolveTenantIdForReservation(req, reservationId);
    const fineId = validateId('fineId', req.params.fineId)!;
    await ReservationTrafficFineService.delete(tenantId, reservationId, fineId);
    sendSuccess(res, { ok: true });
  });
}

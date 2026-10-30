import { Response } from 'express';
import { OperationsService } from '../services/operations.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, ValidationError, AppError, ErrorCode } from '../../../utils/errors';
import { InspectionType } from '../entities/rental-inspection-media.entity';

export class OperationsController {
  static getOperations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const result = await OperationsService.getOperationsByDate(tenantId, date);
    sendSuccess(res, result);
  });

  static getPickup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const tid = req.auth.tenantId;
    if (!tid) throw new UnauthorizedError('Unauthorized');
    const { reservationId } = req.params;
    const result = await OperationsService.getPickup(tid, reservationId);
    sendSuccess(res, result);
  });

  static savePickupDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const tid = req.auth.tenantId;
    if (!tid) throw new UnauthorizedError('Unauthorized');
    const { reservationId } = req.params;
    const { odometerKm, fuelLevel, photos } = req.body;
    const pickup = await OperationsService.savePickupDraft(
      tid,
      reservationId,
      req.auth.sub || 'unknown',
      { odometerKm, fuelLevel, photos }
    );
    sendSuccess(res, pickup);
  });

  static completePickup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const tid = req.auth.tenantId;
    if (!tid) throw new UnauthorizedError('Unauthorized');
    const { reservationId } = req.params;
    const { odometerKm, fuelLevel, photos } = req.body;
    if (!odometerKm || !fuelLevel || !photos || photos.length !== 8) {
      throw new ValidationError('odometerKm, fuelLevel, and exactly 8 photos are required');
    }
    const pickup = await OperationsService.completePickup(
      tid,
      reservationId,
      req.auth.sub || 'unknown',
      { odometerKm: Number(odometerKm), fuelLevel, photos }
    );
    sendSuccess(res, { pickup, message: 'Pickup completed successfully' });
  });

  static getReturn = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const tid = req.auth.tenantId;
    if (!tid) throw new UnauthorizedError('Unauthorized');
    const { reservationId } = req.params;
    const result = await OperationsService.getReturn(tid, reservationId);
    sendSuccess(res, result);
  });

  static saveReturnDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const tid = req.auth.tenantId;
    if (!tid) throw new UnauthorizedError('Unauthorized');
    const { reservationId } = req.params;
    const { odometerKm, fuelLevel, photos } = req.body;
    const returnRecord = await OperationsService.saveReturnDraft(
      tid,
      reservationId,
      req.auth.sub || 'unknown',
      { odometerKm, fuelLevel, photos }
    );
    sendSuccess(res, returnRecord);
  });

  static completeReturn = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const tid = req.auth.tenantId;
    if (!tid) throw new UnauthorizedError('Unauthorized');
    const { reservationId } = req.params;
    const { odometerKm, fuelLevel, photos, acknowledgedWarnings } = req.body;
    if (!odometerKm || !fuelLevel || !photos || photos.length !== 8) {
      throw new ValidationError('odometerKm, fuelLevel, and exactly 8 photos are required');
    }
    try {
      const result = await OperationsService.completeReturn(
        tid,
        reservationId,
        req.auth.sub || 'unknown',
        { odometerKm: Number(odometerKm), fuelLevel, photos, acknowledgedWarnings }
      );
      sendSuccess(res, { return: result.return, warnings: result.warnings, message: 'Return completed successfully' });
    } catch (err: any) {
      if (err.statusCode === 422 && err.warnings) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Warnings must be acknowledged', 422, err.warnings);
      }
      throw err;
    }
  });

  static getDamageCompare = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const tid = req.auth.tenantId;
    if (!tid) throw new UnauthorizedError('Unauthorized');
    const { reservationId } = req.params;
    const result = await OperationsService.getDamageCompare(tid, reservationId);
    sendSuccess(res, result);
  });

  /** POST multipart: file, reservationId, slotIndex (1-8), inspectionType (pickup|return) */
  static uploadInspectionMedia = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth?.tenantId) throw new UnauthorizedError('Unauthorized');
    if (!req.file) throw new ValidationError('No file uploaded');
    const tid = req.auth.tenantId;
    const reservationId = String(req.body.reservationId || '').trim();
    const slotIndex = parseInt(String(req.body.slotIndex), 10);
    const inspectionTypeRaw = String(req.body.inspectionType || 'pickup').toLowerCase();
    if (!reservationId || !Number.isFinite(slotIndex)) {
      throw new ValidationError('reservationId and slotIndex are required');
    }
    const inspectionType =
      inspectionTypeRaw === 'return' ? InspectionType.RETURN : InspectionType.PICKUP;
    const fileUrl = `/uploads/${req.file.filename}`;
    const media = await OperationsService.upsertInspectionMediaFromUrl(
      tid,
      reservationId,
      inspectionType,
      slotIndex,
      fileUrl
    );
    sendSuccess(res, { mediaId: media.id, url: fileUrl });
  });
}

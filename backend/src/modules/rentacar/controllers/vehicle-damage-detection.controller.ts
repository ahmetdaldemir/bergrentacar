import { Response } from 'express';
import { VehicleDamageDetectionService } from '../services/vehicle-damage-detection.service';
import { OperationsService } from '../services/operations.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, ValidationError, NotFoundError } from '../../../utils/errors';

export class VehicleDamageDetectionController {
  static processDetection = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { vehicleId, reservationId } = req.params;
    let { checkinPhotoUrls, checkoutPhotoUrls } = req.body;

    if (!checkinPhotoUrls || !Array.isArray(checkinPhotoUrls) || checkinPhotoUrls.length === 0 ||
        !checkoutPhotoUrls || !Array.isArray(checkoutPhotoUrls) || checkoutPhotoUrls.length === 0) {
      try {
        const damageCompare = await OperationsService.getDamageCompare(tenantId, reservationId);
        if (damageCompare.pickupPhotos?.length) checkinPhotoUrls = damageCompare.pickupPhotos.map(p => p.url);
        if (damageCompare.returnPhotos?.length) checkoutPhotoUrls = damageCompare.returnPhotos.map(p => p.url);
      } catch {
        // continue with validation below
      }
    }

    if (!checkinPhotoUrls || !Array.isArray(checkinPhotoUrls) || checkinPhotoUrls.length === 0) {
      throw new ValidationError('checkinPhotoUrls is required and must be a non-empty array. Please complete pickup operation first or provide photos manually.');
    }
    if (!checkoutPhotoUrls || !Array.isArray(checkoutPhotoUrls) || checkoutPhotoUrls.length === 0) {
      throw new ValidationError('checkoutPhotoUrls is required and must be a non-empty array. Please complete return operation first or provide photos manually.');
    }

    const detection = await VehicleDamageDetectionService.processDetection(
      { vehicleId, reservationId, checkinPhotoUrls, checkoutPhotoUrls },
      tenantId
    );
    sendSuccess(res, detection);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const detection = await VehicleDamageDetectionService.getById(id, tenantId);
    if (!detection) throw new NotFoundError('Detection', id);
    sendSuccess(res, detection);
  });

  static getByVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { vehicleId } = req.params;
    const detections = await VehicleDamageDetectionService.getByVehicle(vehicleId, tenantId);
    sendSuccess(res, detections);
  });

  static getByReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { reservationId } = req.params;
    const detection = await VehicleDamageDetectionService.getByReservation(reservationId, tenantId);
    if (!detection) throw new NotFoundError('Detection', reservationId);
    sendSuccess(res, detection);
  });

  static verifyDetection = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const { isDamage, notes } = req.body;
    if (typeof isDamage !== 'boolean') throw new ValidationError('isDamage must be a boolean');

    const detection = await VehicleDamageDetectionService.verifyDetection(
      id,
      tenantId,
      req.auth?.sub || tenantId,
      isDamage,
      notes
    );
    sendSuccess(res, detection);
  });
}

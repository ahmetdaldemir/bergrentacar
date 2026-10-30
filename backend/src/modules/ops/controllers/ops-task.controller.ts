import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { OpsTaskService } from '../services/ops-task.service';
import { OpsTaskType, OpsTaskStatus } from '../entities/ops-task.entity';
import { ReservationService } from '../../shared/services/reservation.service';
import { VehicleReservationAssignment } from '../../rentacar/entities/vehicle-reservation-assignment.entity';
import { AppDataSource } from '../../../config/data-source';
import { asyncHandler, sendSuccess, UnauthorizedError, ValidationError, NotFoundError } from '../../../utils/errors';

type AuthTenantRequest = AuthenticatedRequest & TenantRequest;

/**
 * Görev özeti — e-posta ve telefon dışında sınırlı alanlar.
 */
interface OpsTaskSummaryDto {
  id: string;
  type: OpsTaskType;
  status: OpsTaskStatus;
  reservation: {
    id: string;
    reference: string;
    customerName: string; // Only name, no email/phone
    checkIn?: Date | null;
    checkOut?: Date | null;
  };
  vehicle?: {
    plateNumber?: string;
    brand?: string;
    model?: string;
    year?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class OpsTaskController {
  static list = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { type, status, dateFrom, dateTo } = req.query;
    const tasks = await OpsTaskService.getTasks(tenantId, {
      type: type as OpsTaskType | undefined,
      status: status as OpsTaskStatus | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    const assignmentRepo = AppDataSource.getRepository(VehicleReservationAssignment);
    const dtos: OpsTaskSummaryDto[] = await Promise.all(
      tasks.map(async (task) => {
        const reservation = await ReservationService.getById(task.reservationId);
        const assignment = await assignmentRepo.findOne({
          where: { reservationId: task.reservationId },
          relations: ['plate', 'plate.vehicle', 'plate.vehicle.brand', 'plate.vehicle.model'],
        });
        return {
          id: task.id,
          type: task.type,
          status: task.status,
          reservation: {
            id: reservation?.id || task.reservationId,
            reference: reservation?.reference || 'N/A',
            customerName: reservation?.customerName || 'N/A',
            checkIn: reservation?.checkIn || null,
            checkOut: reservation?.checkOut || null,
          },
          vehicle: assignment?.plate
            ? {
                plateNumber: assignment.plate.plateNumber,
                brand: assignment.plate.vehicle?.brand?.name || assignment.plate.vehicle?.brandName,
                model: assignment.plate.vehicle?.model?.name || assignment.plate.vehicle?.modelName,
                year: assignment.plate.vehicle?.year,
              }
            : undefined,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      })
    );
    sendSuccess(res, dtos);
  });

  static getById = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const task = await OpsTaskService.getTaskById(id, tenantId);
    if (!task) throw new NotFoundError('Task', id);

    const reservation = await ReservationService.getById(task.reservationId);
    const assignmentRepo = AppDataSource.getRepository(VehicleReservationAssignment);
    const assignment = await assignmentRepo.findOne({
      where: { reservationId: task.reservationId },
      relations: ['plate', 'plate.vehicle', 'plate.vehicle.brand', 'plate.vehicle.model'],
    });
    const dto: OpsTaskSummaryDto = {
      id: task.id,
      type: task.type,
      status: task.status,
      reservation: {
        id: reservation?.id || task.reservationId,
        reference: reservation?.reference || 'N/A',
        customerName: reservation?.customerName || 'N/A',
        checkIn: reservation?.checkIn || null,
        checkOut: reservation?.checkOut || null,
      },
      vehicle: assignment?.plate
        ? {
            plateNumber: assignment.plate.plateNumber,
            brand: assignment.plate.vehicle?.brand?.name || assignment.plate.vehicle?.brandName,
            model: assignment.plate.vehicle?.model?.name || assignment.plate.vehicle?.modelName,
            year: assignment.plate.vehicle?.year,
          }
        : undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
    sendSuccess(res, dto);
  });

  static createOrGet = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { reservationId, type } = req.body;
    if (!reservationId || !type) throw new ValidationError('reservationId and type are required');

    const task = await OpsTaskService.createOrGetTask({ reservationId, type: type as OpsTaskType }, tenantId);
    sendSuccess(res, { id: task.id, type: task.type, status: task.status }, 201);
  });

  static updateMedia = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const { mediaIds } = req.body;
    if (!Array.isArray(mediaIds)) throw new ValidationError('mediaIds must be an array');

    const task = await OpsTaskService.updateMedia(id, tenantId, { mediaIds });
    sendSuccess(res, { id: task.id, mediaIds: task.mediaIds });
  });

  static verifyDocs = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const { licenseVerified, licenseMediaIds, passportVerified, passportMediaIds } = req.body;
    const task = await OpsTaskService.verifyDocs(id, tenantId, {
      licenseVerified: Boolean(licenseVerified),
      licenseMediaIds: Array.isArray(licenseMediaIds) ? licenseMediaIds : [],
      passportVerified: Boolean(passportVerified),
      passportMediaIds: Array.isArray(passportMediaIds) ? passportMediaIds : [],
    });
    sendSuccess(res, { id: task.id, licenseVerified: task.licenseVerified, passportVerified: task.passportVerified });
  });

  static finalizeCheckout = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    const userId = req.auth?.sub;
    if (!tenantId || !userId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const result = await OpsTaskService.finalizeCheckout(id, tenantId, userId);
    sendSuccess(res, result);
  });

  static finalizeReturn = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    const userId = req.auth?.sub;
    if (!tenantId || !userId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const { fuelLevel, mileage, damageNotes, damageMediaIds } = req.body;
    await OpsTaskService.finalizeReturn(id, tenantId, userId, {
      fuelLevel: fuelLevel ? Number(fuelLevel) : undefined,
      mileage: mileage ? Number(mileage) : undefined,
      damageNotes,
      damageMediaIds: Array.isArray(damageMediaIds) ? damageMediaIds : [],
    });
    sendSuccess(res, {});
  });

  static getPrintPayload = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const task = await OpsTaskService.getTaskById(id, tenantId);
    if (!task) throw new NotFoundError('Task', id);

    const printPayload = await OpsTaskService.generatePrintPayload(task);
    sendSuccess(res, printPayload);
  });

  static startTask = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    const userId = req.auth?.sub;
    if (!tenantId || !userId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const task = await OpsTaskService.startTask(id, tenantId, userId);
    sendSuccess(res, { task });
  });

  static updateChecklist = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const { itemsTotal, itemsCompleted } = req.body;
    const task = await OpsTaskService.updateChecklist(id, tenantId, {
      itemsTotal: parseInt(itemsTotal),
      itemsCompleted: parseInt(itemsCompleted),
    });
    sendSuccess(res, { task });
  });

  static updateMediaCounts = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const { requiredPhotos, uploadedPhotos, requiredVideos, uploadedVideos } = req.body;
    const task = await OpsTaskService.updateMediaCounts(id, tenantId, {
      requiredPhotos: requiredPhotos ? parseInt(requiredPhotos) : undefined,
      uploadedPhotos: uploadedPhotos ? parseInt(uploadedPhotos) : undefined,
      requiredVideos: requiredVideos ? parseInt(requiredVideos) : undefined,
      uploadedVideos: uploadedVideos ? parseInt(uploadedVideos) : undefined,
    });
    sendSuccess(res, { task });
  });

  static recordError = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const { errorType, description } = req.body;
    const task = await OpsTaskService.recordError(id, tenantId, {
      errorType: errorType as 'dataEntry' | 'verification' | 'other',
      description,
    });
    sendSuccess(res, { task });
  });
}


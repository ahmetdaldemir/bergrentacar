import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { TransferVehicleService, CreateTransferVehicleInput, UpdateTransferVehicleInput } from '../services/transfer-vehicle.service';
import { TransferVehicleType } from '../entities/transfer-vehicle.entity';
import { processImageTo72DPI } from '../../../utils/image-processor';
import { getUploadsDir } from '../../../config/uploads-path';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, UnauthorizedError } from '../../../utils/errors';
import { getTenantIdFromAuth } from '../../../utils/validation';
import { TenantFeaturesService } from '../../shared/services/tenant-features.service';

export class TransferVehicleController {
  static uploadImages = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromAuth(req);
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const isPrimary = req.body.isPrimary === 'true' || req.query.isPrimary === 'true';
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) throw new ValidationError('At least one image file is required');

      const uploadsDir = getUploadsDir();
      const imageUrls = [];
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const originalPath = path.join(uploadsDir, file.filename);

        try {
          const processedFilename = `transfer-vehicle-${Date.now()}-${Math.round(Math.random() * 1e9)}-${index}.jpg`;
          const processedPath = path.join(uploadsDir, processedFilename);
          await processImageTo72DPI(originalPath, processedPath);
          if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
          }
          imageUrls.push({
            url: `/uploads/${processedFilename}`,
            isPrimary: index === 0 && isPrimary,
          });
        } catch (error) {
          console.error(`Failed to process image ${file.filename}:`, error);
          imageUrls.push({
            url: `/uploads/${file.filename}`,
            isPrimary: index === 0 && isPrimary,
          });
        }
      }

    const vehicle = await TransferVehicleService.uploadImages(id, tenantId, imageUrls);
    sendSuccess(res, { vehicle, uploadedCount: files.length, message: `${files.length} image(s) uploaded successfully` });
  });

  static deleteImage = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromAuth(req);
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id, imageId } = req.params;
    await TransferVehicleService.deleteImage(id, imageId, tenantId);
    sendSuccess(res, { message: 'Image deleted successfully' });
  });

  static setPrimaryImage = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromAuth(req);
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id, imageId } = req.params;
    const vehicle = await TransferVehicleService.setPrimaryImage(id, imageId, tenantId);
    sendSuccess(res, { vehicle, message: 'Primary image updated' });
  });

  static reorderImages = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromAuth(req);
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const { imageOrders } = req.body;
    if (!imageOrders || !Array.isArray(imageOrders)) throw new ValidationError('imageOrders array is required');
    const vehicle = await TransferVehicleService.reorderImages(id, tenantId, imageOrders);
    sendSuccess(res, { vehicle, message: 'Images reordered successfully' });
  });

  static list = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromAuth(req);
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const raw = typeof req.query.scope === 'string' ? req.query.scope.toLowerCase() : '';
    const scope = raw === 'vip' || raw === 'shuttle' ? (raw as 'vip' | 'shuttle') : undefined;
    if (scope === 'shuttle') {
      const shuttleOk = await TenantFeaturesService.hasFeature(tenantId, 'transferShuttle');
      if (!shuttleOk) {
        sendSuccess(res, []);
        return;
      }
    }
    const vehicles = await TransferVehicleService.list(tenantId, scope ? { scope } : undefined);
    sendSuccess(res, vehicles);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromAuth(req);
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const vehicle = await TransferVehicleService.getById(id, tenantId);
    if (!vehicle) throw new NotFoundError('Transfer vehicle', id);
    sendSuccess(res, vehicle);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromAuth(req);
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const input: CreateTransferVehicleInput = { ...req.body, tenantId };
    if (input.type === TransferVehicleType.SHUTTLE) {
      const shuttleOk = await TenantFeaturesService.hasFeature(tenantId, 'transferShuttle');
      if (!shuttleOk) throw new ValidationError('Shuttle transfer is disabled for this tenant');
    }
    const vehicle = await TransferVehicleService.create(input);
    sendSuccess(res, vehicle, 201);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromAuth(req);
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const input: UpdateTransferVehicleInput = req.body;
    if (input.type === TransferVehicleType.SHUTTLE) {
      const shuttleOk = await TenantFeaturesService.hasFeature(tenantId, 'transferShuttle');
      if (!shuttleOk) throw new ValidationError('Shuttle transfer is disabled for this tenant');
    }
    const vehicle = await TransferVehicleService.update(id, tenantId, input);
    sendSuccess(res, vehicle);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = getTenantIdFromAuth(req);
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    await TransferVehicleService.delete(id, tenantId);
    res.status(204).send();
  });
}


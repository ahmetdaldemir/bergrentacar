import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, UnauthorizedError } from '../../../utils/errors';
import { TransferVehicleFeatureService } from '../services/transfer-vehicle-feature.service';
import { upload } from '../../shared/controllers/file-upload.controller';

export class TransferVehicleFeatureController {
  /**
   * List all features for a tenant
   * GET /api/transfer/vehicle-features?tenantId=xxx&isActive=true
   */
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const features = await TransferVehicleFeatureService.list(tenantId, isActive);
    sendSuccess(res, features);
  });

  /**
   * Get feature by ID
   * GET /api/transfer/vehicle-features/:id?tenantId=xxx
   */
  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const feature = await TransferVehicleFeatureService.getById(id, tenantId);
    if (!feature) throw new NotFoundError('Transfer vehicle feature', id);
    sendSuccess(res, feature);
  });

  /**
   * Create new feature
   * POST /api/transfer/vehicle-features
   */
  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const feature = await TransferVehicleFeatureService.create({
      tenantId,
      name: req.body.name,
      icon: req.body.icon,
      code: req.body.code,
      isActive: req.body.isActive,
      sortOrder: req.body.sortOrder,
      translations: req.body.translations,
    });
    sendSuccess(res, feature, 201);
  });

  /**
   * Update feature
   * PUT /api/transfer/vehicle-features/:id
   */
  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const feature = await TransferVehicleFeatureService.update(id, tenantId, {
      name: req.body.name,
      icon: req.body.icon,
      code: req.body.code,
      isActive: req.body.isActive,
      sortOrder: req.body.sortOrder,
      translations: req.body.translations,
    });
    sendSuccess(res, feature);
  });

  /**
   * Delete feature
   * DELETE /api/transfer/vehicle-features/:id
   */
  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    await TransferVehicleFeatureService.delete(id, tenantId);
    res.status(204).send();
  });

  /**
   * Reorder features
   * PUT /api/transfer/vehicle-features/reorder
   */
  static reorder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { featureOrders } = req.body;
    if (!Array.isArray(featureOrders)) throw new ValidationError('featureOrders must be an array');
    await TransferVehicleFeatureService.reorder(tenantId, featureOrders);
    sendSuccess(res, { message: 'Features reordered successfully' });
  });

  /**
   * Upload icon image
   * POST /api/transfer/vehicle-features/:id/upload-icon
   */
  static uploadIcon = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    if (!req.file) throw new ValidationError('No file uploaded');
    const iconUrl = `/uploads/${req.file.filename}`;
    const feature = await TransferVehicleFeatureService.update(id, tenantId, { icon: iconUrl });
    sendSuccess(res, { feature, iconUrl, message: 'Icon uploaded successfully' });
  });
}


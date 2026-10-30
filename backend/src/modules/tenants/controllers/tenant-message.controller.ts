import { Response } from 'express';
import { TenantMessageService } from '../services/tenant-message.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, UnauthorizedError } from '../../../utils/errors';

export class TenantMessageController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const messages = await TenantMessageService.list(tenantId);
    sendSuccess(res, messages);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const message = await TenantMessageService.getById(id, tenantId);
    if (!message) throw new NotFoundError('Mesaj', id);
    sendSuccess(res, message);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { title, message, type } = req.body;
    if (!title || !message) throw new ValidationError('title ve message gerekli');
    const createdMessage = await TenantMessageService.create({
      tenantId,
      title,
      message,
      type,
      createdById: req.auth?.sub,
    });
    sendSuccess(res, createdMessage, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const updatedMessage = await TenantMessageService.update(id, tenantId, req.body);
    sendSuccess(res, updatedMessage);
  });

  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    await TenantMessageService.delete(id, tenantId);
    res.status(204).send();
  });

  static markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const message = await TenantMessageService.markAsRead(id, tenantId);
    sendSuccess(res, message);
  });
}

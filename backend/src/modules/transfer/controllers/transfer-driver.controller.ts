import { Request, Response } from 'express';
import { TransferDriverService, CreateTransferDriverInput, UpdateTransferDriverInput } from '../services/transfer-driver.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, UnauthorizedError } from '../../../utils/errors';

export class TransferDriverController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const availableOnly = req.query.availableOnly === 'true';
    const drivers = availableOnly
      ? await TransferDriverService.getAvailableDrivers(tenantId)
      : await TransferDriverService.list(tenantId);
    sendSuccess(res, drivers);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const driver = await TransferDriverService.getById(id, tenantId);
    if (!driver) throw new NotFoundError('Transfer driver', id);
    sendSuccess(res, driver);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const input: CreateTransferDriverInput = { ...req.body, tenantId };
    const driver = await TransferDriverService.create(input);
    sendSuccess(res, driver, 201);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const input: UpdateTransferDriverInput = req.body;
    const driver = await TransferDriverService.update(id, tenantId, input);
    sendSuccess(res, driver);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    await TransferDriverService.delete(id, tenantId);
    res.status(204).send();
  });
}

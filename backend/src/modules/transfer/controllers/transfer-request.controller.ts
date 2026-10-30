import { Request, Response } from 'express';
import { TransferRequestService, CreateTransferRequestInput } from '../services/transfer-request.service';
import { TransferRequestStatus } from '../entities/transfer-request.entity';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError } from '../../../utils/errors';

const service = new TransferRequestService();

export const TransferRequestController = {
  createPublic: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const body = req.body as CreateTransferRequestInput;
    if (!body.customerName || !body.customerEmail || !body.customerPhone) {
      throw new ValidationError('customerName, customerEmail and customerPhone are required');
    }
    if (!body.pickup?.location || !body.dropoff?.location) {
      throw new ValidationError('pickup.location and dropoff.location are required');
    }
    if (!body.passengerCount || body.passengerCount < 1) {
      throw new ValidationError('passengerCount must be at least 1');
    }
    const input: CreateTransferRequestInput = {
      tenantId,
      languageId: body.languageId ?? null,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      message: body.message ?? null,
      pickup: body.pickup,
      dropoff: body.dropoff,
      passengerCount: Number(body.passengerCount),
      transferDate: body.transferDate ?? null,
      routeInfo: body.routeInfo ?? null,
      requestedAt: body.requestedAt || new Date().toISOString(),
      source: body.source || 'web',
    };
    const request = await service.create(input);
    sendSuccess(res, request, 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const status = req.query.status as TransferRequestStatus | undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await service.list({ tenantId, status, page, limit });
    sendSuccess(res, {
      data: result.data,
      pagination: { total: result.total, page, limit, pages: Math.ceil(result.total / limit) },
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const { id } = req.params;
    const request = await service.getById(tenantId, id);
    if (!request) throw new NotFoundError('Transfer request', id);
    sendSuccess(res, request);
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const { id } = req.params;
    const { status, adminNote } = req.body;
    const validStatuses = Object.values(TransferRequestStatus);
    if (!status || !validStatuses.includes(status)) {
      throw new ValidationError(`status must be one of: ${validStatuses.join(', ')}`);
    }
    const updated = await service.updateStatus(tenantId, id, status, adminNote);
    if (!updated) throw new NotFoundError('Transfer request', id);
    sendSuccess(res, updated);
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const { id } = req.params;
    const deleted = await service.delete(tenantId, id);
    if (!deleted) throw new NotFoundError('Transfer request', id);
    sendSuccess(res, {});
  }),
};

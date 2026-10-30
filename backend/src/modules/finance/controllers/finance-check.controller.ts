import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError } from '../../../utils/errors';
import { FinanceCheckService } from '../services/finance-check.service';
import { FinanceCheckDirection, FinanceCheckStatus } from '../entities/finance-check.entity';

export class FinanceCheckController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const filters: any = {};
    if (req.query.direction) filters.direction = req.query.direction as FinanceCheckDirection;
    if (req.query.status) filters.status = req.query.status as FinanceCheckStatus;
    if (req.query.from) filters.from = new Date(req.query.from as string);
    if (req.query.to) filters.to = new Date(req.query.to as string);
    if (req.query.cariId) filters.cariId = req.query.cariId as string;

    const checks = await FinanceCheckService.list(tenantId, filters);
    sendSuccess(res, checks);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const check = await FinanceCheckService.getById(id, tenantId);
    if (!check) throw new NotFoundError('Check', id);
    sendSuccess(res, check);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const check = await FinanceCheckService.create({ ...req.body, tenantId });
    sendSuccess(res, check, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const check = await FinanceCheckService.update(id, tenantId, req.body);
    sendSuccess(res, check);
  });

  static markStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const check = await FinanceCheckService.markStatus(id, tenantId, status as FinanceCheckStatus);
    sendSuccess(res, check);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    await FinanceCheckService.remove(id, tenantId);
    res.status(204).send();
  });
}

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError } from '../../../utils/errors';
import { FinanceCategoryService } from '../services/finance-category.service';
import { FinanceCategoryType } from '../entities/finance-category.entity';

export class FinanceCategoryController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const type = req.query.type as FinanceCategoryType | undefined;
    const parentId = req.query.parentId === 'null' ? null : (req.query.parentId as string | undefined);
    const categories = await FinanceCategoryService.list(tenantId, type, parentId);
    sendSuccess(res, categories);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const category = await FinanceCategoryService.getById(id, tenantId);
    if (!category) throw new NotFoundError('Category', id);
    sendSuccess(res, category);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const category = await FinanceCategoryService.create({ ...req.body, tenantId });
    sendSuccess(res, category, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const category = await FinanceCategoryService.update(id, tenantId, req.body);
    sendSuccess(res, category);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    await FinanceCategoryService.remove(id, tenantId);
    res.status(204).send();
  });
}


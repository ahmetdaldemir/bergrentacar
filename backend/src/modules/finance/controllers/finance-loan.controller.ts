import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError } from '../../../utils/errors';
import { FinanceLoanService } from '../services/finance-loan.service';
import { FinanceLoanStatus } from '../entities/finance-loan.entity';

export class FinanceLoanController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const status = req.query.status as FinanceLoanStatus | undefined;
    const loans = await FinanceLoanService.list(tenantId, status);
    sendSuccess(res, loans);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const includeInstallments = req.query.includeInstallments === 'true';
    const loan = await FinanceLoanService.getById(id, tenantId, includeInstallments);
    if (!loan) throw new NotFoundError('Loan', id);
    sendSuccess(res, loan);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const loan = await FinanceLoanService.create({ ...req.body, tenantId });
    sendSuccess(res, loan, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const loan = await FinanceLoanService.update(id, tenantId, req.body);
    sendSuccess(res, loan);
  });

  static close = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const loan = await FinanceLoanService.close(id, tenantId);
    sendSuccess(res, loan);
  });

  static regenerateInstallments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const loan = await FinanceLoanService.getById(id, tenantId);
    if (!loan) throw new NotFoundError('Loan', id);

    const installments = await FinanceLoanService.generateInstallments(id, tenantId, loan);
    sendSuccess(res, { message: 'Installments regenerated', installments });
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    await FinanceLoanService.remove(id, tenantId);
    res.status(204).send();
  });
}

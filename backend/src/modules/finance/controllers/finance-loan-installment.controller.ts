import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError, ValidationError } from '../../../utils/errors';
import { FinanceLoanInstallmentService } from '../services/finance-loan-installment.service';

export class FinanceLoanInstallmentController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const loanId = req.query.loanId as string | undefined;
    const installments = await FinanceLoanInstallmentService.list(tenantId, loanId);
    sendSuccess(res, installments);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const installment = await FinanceLoanInstallmentService.getById(id, tenantId);
    if (!installment) throw new NotFoundError('Installment', id);
    sendSuccess(res, installment);
  });

  static pay = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { paidAmount, paymentMethod } = req.body;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    if (!paidAmount || paidAmount <= 0) throw new ValidationError('paidAmount is required and must be greater than 0');

    const installment = await FinanceLoanInstallmentService.pay(id, tenantId, Number(paidAmount), paymentMethod);
    sendSuccess(res, installment);
  });

  static cancel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const installment = await FinanceLoanInstallmentService.cancel(id, tenantId);
    sendSuccess(res, installment);
  });
}

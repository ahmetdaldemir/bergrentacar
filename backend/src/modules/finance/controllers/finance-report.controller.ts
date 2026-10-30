import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError } from '../../../utils/errors';
import { FinanceReportService } from '../services/finance-report.service';

export class FinanceReportController {
  static summary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    const summary = await FinanceReportService.getSummary(tenantId, from, to);
    sendSuccess(res, summary);
  });
}


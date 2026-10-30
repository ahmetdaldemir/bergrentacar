import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { StaffPerformanceService } from '../services/staff-performance.service';
import { asyncHandler, sendSuccess, UnauthorizedError, ValidationError } from '../../../utils/errors';

type AuthTenantRequest = AuthenticatedRequest & TenantRequest;

export class StaffPerformanceController {
  static getMyScores = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    const userId = req.auth?.sub;
    if (!tenantId || !userId) throw new UnauthorizedError('Authentication required');

    const periodType = (req.query.periodType as 'monthly' | 'weekly' | 'daily') || 'monthly';
    const limit = parseInt(req.query.limit as string) || 12;
    const scores = await StaffPerformanceService.getUserScores(userId, tenantId, periodType, limit);
    sendSuccess(res, { scores });
  });

  static getTenantScores = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const period = req.query.period as string;
    const periodType = (req.query.periodType as 'monthly' | 'weekly' | 'daily') || 'monthly';
    const effectivePeriod =
      period ||
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const scores = await StaffPerformanceService.getTenantScores(
      tenantId,
      effectivePeriod,
      periodType
    );
    sendSuccess(res, { scores, period: effectivePeriod });
  });

  static recalculateScores = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { period, periodType = 'monthly' } = req.body;
    if (!period) throw new ValidationError('Period is required');

    await StaffPerformanceService.recalculatePeriod(
      tenantId,
      period,
      periodType as 'monthly' | 'weekly' | 'daily'
    );
    sendSuccess(res, { message: 'Scores recalculated' });
  });

  static getUserScoreDetails = asyncHandler(async (req: AuthTenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { userId } = req.params;
    const period = req.query.period as string;
    const periodType = (req.query.periodType as 'monthly' | 'weekly' | 'daily') || 'monthly';
    if (!period) throw new ValidationError('Period is required');

    const result = await StaffPerformanceService.calculateScore(
      userId,
      tenantId,
      period,
      periodType
    );
    sendSuccess(res, result);
  });
}

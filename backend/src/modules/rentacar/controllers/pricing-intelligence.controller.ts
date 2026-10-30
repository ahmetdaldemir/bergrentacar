import { Response } from 'express';
import { PricingIntelligenceService } from '../services/pricing-intelligence.service';
import { InsightType, InsightSeverity, InsightStatus } from '../entities/pricing-insight.entity';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError } from '../../../utils/errors';

export class PricingIntelligenceController {
  static analyze = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const result = await PricingIntelligenceService.analyzeTenant(tenantId);
    sendSuccess(res, result);
  });

  static listInsights = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const filters: any = {};
    if (req.query.type) filters.type = req.query.type as InsightType;
    if (req.query.severity) filters.severity = req.query.severity as InsightSeverity;
    if (req.query.status) filters.status = req.query.status as InsightStatus;
    if (req.query.vehicleId) filters.vehicleId = req.query.vehicleId as string;

    const insights = await PricingIntelligenceService.listInsights(tenantId, filters);
    sendSuccess(res, insights);
  });

  static getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const insights = await PricingIntelligenceService.listInsights(tenantId, { status: InsightStatus.ACTIVE });
    const summary = {
      total: insights.length,
      byType: {} as Record<InsightType, number>,
      bySeverity: {} as Record<InsightSeverity, number>,
      critical: insights.filter(i => i.severity === InsightSeverity.CRITICAL).length,
      warning: insights.filter(i => i.severity === InsightSeverity.WARNING).length,
      info: insights.filter(i => i.severity === InsightSeverity.INFO).length,
    };
    insights.forEach(insight => {
      summary.byType[insight.type] = (summary.byType[insight.type] || 0) + 1;
      summary.bySeverity[insight.severity] = (summary.bySeverity[insight.severity] || 0) + 1;
    });
    const topInsights = insights
      .sort((a, b) => {
        const order = { [InsightSeverity.CRITICAL]: 3, [InsightSeverity.WARNING]: 2, [InsightSeverity.INFO]: 1 };
        return order[b.severity] - order[a.severity];
      })
      .slice(0, 10);

    sendSuccess(res, { summary, topInsights });
  });

  static acknowledgeInsight = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const insight = await PricingIntelligenceService.acknowledgeInsight(id, tenantId, req.auth?.sub || tenantId);
    sendSuccess(res, insight);
  });

  static dismissInsight = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const insight = await PricingIntelligenceService.dismissInsight(id, tenantId);
    sendSuccess(res, insight);
  });

  static getDefaultRule = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const rule = await PricingIntelligenceService.getDefaultRule(tenantId);
    sendSuccess(res, rule);
  });
}

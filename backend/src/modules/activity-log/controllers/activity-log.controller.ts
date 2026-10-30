import { Response } from 'express';
import { ActivityLoggerService, ActivityLogFilterParams } from '../services/activity-logger.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { ActivityLogSeverity, ActivityLogStatus } from '../entities/activity-log.entity';
import { getPaginationFromQuery } from '../../../utils/pagination';

export class ActivityLogController {
  /**
   * GET /admin/activity-logs
   * List activity logs with filters and pagination
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const pagination = getPaginationFromQuery(req.query, {
        defaultLimit: 50,
        maxLimit: 100,
        sortOrderKey: 'sort',
        defaultSortOrder: 'desc',
      });
      const params: ActivityLogFilterParams = {
        tenantId: req.query.tenantId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        module: req.query.module as string,
        action: req.query.action as string,
        severity: req.query.severity as ActivityLogSeverity,
        status: req.query.status as ActivityLogStatus,
        actorId: req.query.actorId as string,
        entityType: req.query.entityType as string,
        entityId: req.query.entityId as string,
        requestId: req.query.requestId as string,
        correlationId: req.query.correlationId as string,
        search: req.query.q as string,
        page: pagination.page,
        limit: pagination.limit,
        sort: pagination.sortOrder || 'desc',
      };

      // Tenant scoping: force tenantId for tenant users
      // Only tenant admins can query their own tenant logs
      if (req.auth?.tenantId) {
        params.tenantId = req.auth.tenantId;
      }

      const result = await ActivityLoggerService.find(params);

      return res.json({
        success: true,
        data: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch activity logs',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * GET /admin/activity-logs/:id
   * Get single activity log by ID
   */
  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const log = await ActivityLoggerService.findById(id);

      if (!log) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Activity log not found',
          },
        });
      }

      // Tenant scoping check
      if (req.auth?.tenantId && log.tenantId !== req.auth.tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this activity log',
          },
        });
      }

      // Hide stack_trace for tenant users (security) - only show to admins without tenantId
      const logData = { ...log };
      if (req.auth?.tenantId) {
        delete (logData as any).stackTrace;
      }

      return res.json({
        success: true,
        data: logData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch activity log',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * GET /admin/activity-logs/stats
   * Get activity log statistics
   */
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const params = {
        tenantId: req.query.tenantId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      // Tenant scoping
      if (req.auth?.tenantId) {
        params.tenantId = req.auth.tenantId;
      }

      const stats = await ActivityLoggerService.getStats(params);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch activity log stats',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * POST /admin/activity-logs/cleanup
   * Manual cleanup trigger (delete old logs)
   */
  static async cleanup(req: AuthenticatedRequest, res: Response) {
    try {
      // Only global admins (without tenantId) can trigger cleanup
      if (req.auth?.tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only global admins can trigger cleanup',
          },
        });
      }

      const retentionDays = req.body.retentionDays || parseInt(process.env.ACTIVITY_LOG_RETENTION_DAYS || '180', 10);

      const deletedCount = await ActivityLoggerService.deleteOldLogs(retentionDays);

      return res.json({
        success: true,
        data: {
          deletedCount,
          retentionDays,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cleanup activity logs',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}


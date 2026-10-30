/**
 * Activity Logger Service
 * 
 * Core service for recording system activity logs
 * - NEVER throws to caller (catches all errors internally)
 * - Supports async mode (queue) or synchronous mode
 * - All data is sanitized before storage
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { ActivityLog, ActivityLogSeverity, ActivityLogStatus, ActorType } from '../entities/activity-log.entity';
import { sanitizeForLog, sanitizeStackTrace, computeDiff } from '../utils/sanitize.util';
import { logger } from '../../../utils/logger';

export interface ActivityLogInput {
  // Required
  tenantId?: string | null; // null for global/system logs
  module: string;
  action: string;
  message: string;

  // Optional
  severity?: ActivityLogSeverity;
  status?: ActivityLogStatus;
  
  // Actor (who)
  actor?: {
    type?: ActorType;
    id?: string;
    label?: string; // name/email snapshot
  };

  // Entity (what)
  entity?: {
    type?: string;
    id?: string;
    label?: string; // code/plate/name snapshot
  };

  // Request context
  request?: {
    requestId?: string;
    correlationId?: string;
    ip?: string;
    userAgent?: string;
    method?: string;
    path?: string;
    httpStatus?: number;
    durationMs?: number;
  };

  // Data
  metadata?: Record<string, any>;
  before?: Record<string, any>;
  after?: Record<string, any>;
  computeDiff?: boolean; // Auto-compute diff from before/after

  // Error
  error?: {
    code?: string;
    message?: string;
    stack?: string;
  };
}

export interface ActivityLogFilterParams {
  tenantId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  module?: string;
  action?: string;
  severity?: ActivityLogSeverity;
  status?: ActivityLogStatus;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  correlationId?: string;
  search?: string; // Full-text search on message
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
}

export class ActivityLoggerService {
  private static repository(): Repository<ActivityLog> {
    return AppDataSource.getRepository(ActivityLog);
  }

  /**
   * Log activity (main entry point)
   * NEVER throws - catches all errors internally
   */
  static async log(input: ActivityLogInput): Promise<void> {
    try {
      // Queue support disabled for activity logs (write directly for reliability)
      // Activity logs should be written immediately to maintain audit trail integrity

      // Synchronous mode (fallback or no queue)
      await this.writeLog(input);
    } catch (error) {
      // NEVER throw to caller - log to console as last resort
      console.error('[ActivityLogger] Failed to log activity:', {
        input,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Write log to database (internal)
   */
  private static async writeLog(input: ActivityLogInput): Promise<ActivityLog | null> {
    try {
      const repo = this.repository();

      // Sanitize all data fields
      const sanitizedMetadata = input.metadata ? sanitizeForLog(input.metadata) : {};
      const sanitizedBefore = input.before ? sanitizeForLog(input.before) : null;
      const sanitizedAfter = input.after ? sanitizeForLog(input.after) : null;

      // Compute diff if requested and both before/after exist
      let diff: Record<string, any> | null = null;
      if (input.computeDiff && sanitizedBefore && sanitizedAfter) {
        diff = computeDiff(sanitizedBefore, sanitizedAfter);
        if (diff) {
          diff = sanitizeForLog(diff);
        }
      }

      // Create log entry
      const log = repo.create({
        tenantId: input.tenantId || null,
        module: input.module,
        action: input.action,
        severity: input.severity || ActivityLogSeverity.INFO,
        status: input.status || ActivityLogStatus.SUCCESS,
        message: input.message,

        // Actor
        actorType: input.actor?.type || null,
        actorId: input.actor?.id || null,
        actorLabel: input.actor?.label || null,

        // Entity
        entityType: input.entity?.type || null,
        entityId: input.entity?.id || null,
        entityLabel: input.entity?.label || null,

        // Request
        requestId: input.request?.requestId || null,
        correlationId: input.request?.correlationId || null,
        ip: input.request?.ip || null,
        userAgent: input.request?.userAgent || null,
        method: input.request?.method || null,
        path: input.request?.path || null,
        httpStatus: input.request?.httpStatus || null,
        durationMs: input.request?.durationMs || null,

        // Data
        metadata: sanitizedMetadata,
        before: sanitizedBefore,
        after: sanitizedAfter,
        diff,

        // Error
        errorCode: input.error?.code || null,
        errorMessage: input.error?.message || null,
        stackTrace: input.error?.stack ? sanitizeStackTrace(input.error.stack) : null,
      });

      return await repo.save(log);
    } catch (error) {
      // Log error but don't throw
      logger.error('Failed to write activity log to database', {
        input,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Find logs with filters (for admin API)
   */
  static async find(params: ActivityLogFilterParams): Promise<{
    logs: ActivityLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const repo = this.repository();
    
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100); // Max 100 per page
    const skip = (page - 1) * limit;
    const sort = params.sort || 'desc';

    const qb = repo.createQueryBuilder('log');

    // Filters
    if (params.tenantId) {
      qb.andWhere('log.tenantId = :tenantId', { tenantId: params.tenantId });
    }

    if (params.dateFrom) {
      qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: params.dateFrom });
    }

    if (params.dateTo) {
      qb.andWhere('log.createdAt <= :dateTo', { dateTo: params.dateTo });
    }

    if (params.module) {
      qb.andWhere('log.module = :module', { module: params.module });
    }

    if (params.action) {
      qb.andWhere('log.action = :action', { action: params.action });
    }

    if (params.severity) {
      qb.andWhere('log.severity = :severity', { severity: params.severity });
    }

    if (params.status) {
      qb.andWhere('log.status = :status', { status: params.status });
    }

    if (params.actorId) {
      qb.andWhere('log.actorId = :actorId', { actorId: params.actorId });
    }

    if (params.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: params.entityType });
    }

    if (params.entityId) {
      qb.andWhere('log.entityId = :entityId', { entityId: params.entityId });
    }

    if (params.requestId) {
      qb.andWhere('log.requestId = :requestId', { requestId: params.requestId });
    }

    if (params.correlationId) {
      qb.andWhere('log.correlationId = :correlationId', { correlationId: params.correlationId });
    }

    // Full-text search on message (PostgreSQL)
    if (params.search) {
      qb.andWhere("to_tsvector('english', log.message) @@ plainto_tsquery('english', :search)", {
        search: params.search,
      });
    }

    // Sort
    qb.orderBy('log.createdAt', sort === 'asc' ? 'ASC' : 'DESC');

    // Pagination
    const [logs, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find single log by ID
   */
  static async findById(id: string): Promise<ActivityLog | null> {
    const repo = this.repository();
    return repo.findOne({ where: { id } });
  }

  /**
   * Get statistics (counts by module/severity/status)
   */
  static async getStats(params: {
    tenantId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    byModule: Record<string, number>;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    total: number;
  }> {
    const repo = this.repository();
    const qb = repo.createQueryBuilder('log');

    // Filters
    if (params.tenantId) {
      qb.andWhere('log.tenantId = :tenantId', { tenantId: params.tenantId });
    }

    if (params.dateFrom) {
      qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: params.dateFrom });
    }

    if (params.dateTo) {
      qb.andWhere('log.createdAt <= :dateTo', { dateTo: params.dateTo });
    }

    // Get counts
    const [byModuleRaw, bySeverityRaw, byStatusRaw, total] = await Promise.all([
      qb.clone().select('log.module', 'module').addSelect('COUNT(*)', 'count').groupBy('log.module').getRawMany(),
      qb.clone().select('log.severity', 'severity').addSelect('COUNT(*)', 'count').groupBy('log.severity').getRawMany(),
      qb.clone().select('log.status', 'status').addSelect('COUNT(*)', 'count').groupBy('log.status').getRawMany(),
      qb.clone().getCount(),
    ]);

    // Transform to objects
    const byModule: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    byModuleRaw.forEach((row) => {
      byModule[row.module] = parseInt(row.count, 10);
    });

    bySeverityRaw.forEach((row) => {
      bySeverity[row.severity] = parseInt(row.count, 10);
    });

    byStatusRaw.forEach((row) => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    return {
      byModule,
      bySeverity,
      byStatus,
      total,
    };
  }

  /**
   * Delete old logs (retention cleanup)
   */
  static async deleteOldLogs(retentionDays: number): Promise<number> {
    try {
      const repo = this.repository();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Batch delete (1000 at a time to avoid locks)
      const batchSize = 1000;
      let totalDeleted = 0;

      while (true) {
        // Use subquery to get IDs first, then delete
        const idsToDelete = await repo
          .createQueryBuilder('log')
          .select('log.id')
          .where('log.created_at < :cutoffDate', { cutoffDate })
          .limit(batchSize)
          .getMany();

        if (idsToDelete.length === 0) {
          break; // No more records to delete
        }

        const ids = idsToDelete.map((log) => log.id);
        const result = await repo
          .createQueryBuilder()
          .delete()
          .where('id IN (:...ids)', { ids })
          .execute();

        const deleted = result.affected || 0;
        totalDeleted += deleted;

        if (deleted < batchSize) {
          break;
        }

        // Small delay to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      logger.info(`Deleted ${totalDeleted} old activity logs (retention: ${retentionDays} days)`);
      return totalDeleted;
    } catch (error) {
      logger.error('Failed to delete old activity logs', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}


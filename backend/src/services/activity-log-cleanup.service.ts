/**
 * Activity Log Cleanup Service
 * 
 * Scheduled job to delete old activity logs (retention policy)
 * - Runs daily at 2 AM
 * - Configurable retention period (default: 180 days)
 * - Batch deletes to avoid database locks
 */

import * as cron from 'node-cron';
import { ActivityLoggerService } from '../modules/activity-log/services/activity-logger.service';
import { logger } from '../utils/logger';

const DEFAULT_RETENTION_DAYS = 180; // 6 months

/**
 * Get retention days from environment or use default
 */
function getRetentionDays(): number {
  const envValue = process.env.ACTIVITY_LOG_RETENTION_DAYS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_RETENTION_DAYS;
}

/**
 * Run cleanup (can be called manually or by cron)
 */
export async function runActivityLogCleanup(): Promise<void> {
  try {
    const retentionDays = getRetentionDays();
    
    logger.info(`[ActivityLogCleanup] Starting cleanup (retention: ${retentionDays} days)`);

    const deletedCount = await ActivityLoggerService.deleteOldLogs(retentionDays);

    logger.info(`[ActivityLogCleanup] Cleanup completed: ${deletedCount} logs deleted`);
  } catch (error) {
    logger.error('[ActivityLogCleanup] Cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Start activity log cleanup scheduler
 * Runs daily at 2 AM
 */
export function startActivityLogCleanupScheduler(): void {
  const retentionDays = getRetentionDays();
  
  logger.info(`[ActivityLogCleanup] Scheduler started (retention: ${retentionDays} days, runs daily at 2 AM)`);

  // Run daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    await runActivityLogCleanup();
  });
}


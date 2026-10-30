import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { loadEnv } from '../config/env';
import { logger } from '../utils/logger';
import { EventBus, EventTypes } from '../core/event-bus';

const execAsync = promisify(exec);

let cronJob: cron.ScheduledTask | null = null;

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const BACKUP_RETENTION_DAYS = 7; // 7 günlük yedekleri tut

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  created: Date;
  downloadUrl?: string;
}

/**
 * Create backup directory if it doesn't exist
 */
const ensureBackupDir = async (): Promise<void> => {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    logger.info(`Backup directory created: ${BACKUP_DIR}`);
  }
};

/**
 * Generate backup filename with timestamp
 */
const getBackupFilename = (): string => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `backup_${timestamp}.dump`;
};

/**
 * Generate backup ID from filename
 */
const getBackupId = (filename: string): string => {
  return Buffer.from(filename).toString('base64url');
};

/**
 * Get filename from backup ID
 */
export const getFilenameFromId = (id: string): string => {
  return Buffer.from(id, 'base64url').toString('utf8');
};

/**
 * Execute database backup using pg_dump
 */
const createBackup = async (): Promise<BackupInfo> => {
  const config = loadEnv();
  const { database } = config;
  const startTime = Date.now();

  // Ensure backup directory exists
  await ensureBackupDir();

  const filename = getBackupFilename();
  const filepath = path.join(BACKUP_DIR, filename);

  // Emit backup started event
  EventBus.emit(EventTypes.BACKUP_STARTED, { filename });

  // Build pg_dump command
  const pgDumpCommand = `PGPASSWORD="${database.password}" pg_dump -h ${database.host} -p ${database.port} -U ${database.username} -d ${database.name} -F c -f ${filepath}`;

  try {
    logger.info(`Starting database backup: ${filename}`);

    // Execute pg_dump
    await execAsync(pgDumpCommand, {
      env: {
        ...process.env,
        PGPASSWORD: database.password,
      },
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    // Check if backup file was created
    const stats = await fs.stat(filepath);
    const duration = Date.now() - startTime;
    
    const backupInfo: BackupInfo = {
      id: getBackupId(filename),
      filename,
      size: stats.size,
      created: stats.birthtime,
      downloadUrl: `/api/backups/download/${getBackupId(filename)}`,
    };

    logger.info(`Database backup completed: ${filename} (${(stats.size / (1024 * 1024)).toFixed(2)} MB) in ${(duration / 1000).toFixed(1)}s`);
    
    // Emit backup completed event
    EventBus.emit(EventTypes.BACKUP_COMPLETED, {
      filename,
      size: stats.size,
      downloadUrl: backupInfo.downloadUrl,
      duration,
    });

    return backupInfo;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Database backup failed: ${errorMessage}`);

    // Emit backup failed event
    EventBus.emit(EventTypes.BACKUP_FAILED, {
      filename,
      error: errorMessage,
    });

    // Try to remove failed backup file if it exists
    try {
      await fs.unlink(filepath);
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  }
};

/**
 * Clean up old backup files (older than retention days)
 */
const cleanupOldBackups = async (): Promise<number> => {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const now = Date.now();
    const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      if (!file.startsWith('backup_') || !file.endsWith('.dump')) {
        continue;
      }

      const filepath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filepath);
      const fileAge = now - stats.mtimeMs;

      if (fileAge > retentionMs) {
        await fs.unlink(filepath);
        deletedCount++;
        logger.info(`Deleted old backup: ${file} (${Math.round(fileAge / (24 * 60 * 60 * 1000))} days old)`);
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleanup completed: ${deletedCount} old backup(s) deleted`);
    }
    
    return deletedCount;
  } catch (error) {
    logger.error(`Backup cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }
};

/**
 * Perform backup with error handling
 */
const performBackup = async (): Promise<void> => {
  try {
    await createBackup();
    await cleanupOldBackups();
  } catch (error) {
    logger.error(`Backup process failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Start database backup scheduler
 * Runs daily at 00:10 (midnight + 10 minutes)
 */
export const startDatabaseBackupScheduler = (): void => {
  // Ensure backup directory exists
  ensureBackupDir().catch((error) => {
    logger.error(`Failed to create backup directory: ${error instanceof Error ? error.message : String(error)}`);
  });

  // Cron pattern: "10 0 * * *" = minute 10, hour 0 (00:10), every day
  cronJob = cron.schedule('10 0 * * *', async () => {
    try {
      logger.info(`[${new Date().toISOString()}] Starting scheduled database backup...`);
      await performBackup();
      logger.info(`[${new Date().toISOString()}] Scheduled database backup completed`);
    } catch (error) {
      logger.error(`[${new Date().toISOString()}] Scheduled database backup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, {
    timezone: 'Europe/Istanbul',
  });

  logger.info(`✅ Database backup scheduler started (daily at 00:10, retention: ${BACKUP_RETENTION_DAYS} days)`);
};

/**
 * Stop database backup scheduler
 */
export const stopDatabaseBackupScheduler = (): void => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Database backup scheduler stopped');
  }
};

/**
 * Trigger manual backup
 */
export const triggerManualBackup = async (): Promise<BackupInfo> => {
  logger.info('Manual backup triggered');
  return createBackup();
};

/**
 * Get list of backup files
 */
export const listBackups = async (): Promise<BackupInfo[]> => {
  try {
    await ensureBackupDir();
    const files = await fs.readdir(BACKUP_DIR);
    const backups: BackupInfo[] = [];

    for (const file of files) {
      if (!file.startsWith('backup_') || !file.endsWith('.dump')) {
        continue;
      }

      const filepath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filepath);
      const id = getBackupId(file);
      
      backups.push({
        id,
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        downloadUrl: `/api/backups/download/${id}`,
      });
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => b.created.getTime() - a.created.getTime());

    return backups;
  } catch (error) {
    logger.error(`Failed to list backups: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

/**
 * Get backup file path for download
 */
export const getBackupFilePath = async (id: string): Promise<string | null> => {
  try {
    const filename = getFilenameFromId(id);
    const filepath = path.join(BACKUP_DIR, filename);
    
    // Check if file exists
    await fs.access(filepath);
    
    return filepath;
  } catch {
    return null;
  }
};

/**
 * Delete a specific backup
 */
export const deleteBackup = async (id: string): Promise<boolean> => {
  try {
    const filename = getFilenameFromId(id);
    const filepath = path.join(BACKUP_DIR, filename);
    
    await fs.unlink(filepath);
    logger.info(`Backup deleted: ${filename}`);
    
    return true;
  } catch (error) {
    logger.error(`Failed to delete backup: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

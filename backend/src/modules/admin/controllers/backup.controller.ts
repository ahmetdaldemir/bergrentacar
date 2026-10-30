import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/errors';
import * as BackupService from '../../../services/database-backup.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';

export class BackupController {
  /**
   * Get list of all backups
   * GET /api/admin/backups
   */
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const backups = await BackupService.listBackups();
    
    res.json({
      success: true,
      data: backups.map(backup => ({
        ...backup,
        sizeFormatted: formatFileSize(backup.size),
        createdFormatted: backup.created.toLocaleString('tr-TR'),
      })),
      count: backups.length,
    });
  });

  /**
   * Trigger manual backup
   * POST /api/admin/backups/create
   */
  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const backup = await BackupService.triggerManualBackup();
    
    res.status(201).json({
      success: true,
      data: {
        ...backup,
        sizeFormatted: formatFileSize(backup.size),
        createdFormatted: backup.created.toLocaleString('tr-TR'),
      },
      message: 'Backup created successfully',
    });
  });

  /**
   * Download a backup file
   * GET /api/backups/download/:id
   * Note: This endpoint does not require authentication for direct downloads
   */
  static download = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const filepath = await BackupService.getBackupFilePath(id);
    
    if (!filepath) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found',
      });
    }
    
    const filename = BackupService.getFilenameFromId(id);
    
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Download failed',
          });
        }
      }
    });
  });

  /**
   * Delete a backup
   * DELETE /api/admin/backups/:id
   */
  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    
    const success = await BackupService.deleteBackup(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found or could not be deleted',
      });
    }
    
    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  });
}

/**
 * Format file size to human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

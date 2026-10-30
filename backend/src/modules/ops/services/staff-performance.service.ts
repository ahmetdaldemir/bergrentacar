import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { StaffPerformanceScore } from '../entities/staff-performance-score.entity';
import { OpsTask, OpsTaskStatus } from '../entities/ops-task.entity';
import { TenantUser } from '../../tenants/entities/tenant-user.entity';

export interface ScoreCalculationResult {
  timelinessScore: number;
  completenessScore: number;
  accuracyScore: number;
  overallScore: number;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    onTimeCompletions: number;
    lateCompletions: number;
    missingDataCount: number;
    errorCount: number;
    totalErrors: number;
  };
  details: {
    timeliness?: any;
    completeness?: any;
    accuracy?: any;
  };
}

export class StaffPerformanceService {
  private static scoreRepo(): Repository<StaffPerformanceScore> {
    return AppDataSource.getRepository(StaffPerformanceScore);
  }

  private static taskRepo(): Repository<OpsTask> {
    return AppDataSource.getRepository(OpsTask);
  }

  private static userRepo(): Repository<TenantUser> {
    return AppDataSource.getRepository(TenantUser);
  }

  /**
   * Calculate performance score for a staff member
   */
  static async calculateScore(
    userId: string,
    tenantId: string,
    period: string,
    periodType: 'monthly' | 'weekly' | 'daily' = 'monthly'
  ): Promise<ScoreCalculationResult> {
    // Get date range for period
    const { startDate, endDate } = this.getPeriodDates(period, periodType);

    // Get all tasks completed by this user in the period
    const tasks = await this.taskRepo().find({
      where: {
        tenantId,
        completedByUserId: userId,
        completedAt: Between(startDate, endDate),
        status: OpsTaskStatus.COMPLETED,
      },
      order: {
        completedAt: 'ASC',
      },
    });

    // Calculate metrics
    const metrics = this.calculateMetrics(tasks);
    const scores = this.calculateScores(metrics, tasks);

    // Save or update score record
    await this.saveScore(userId, tenantId, period, periodType, scores, metrics, tasks);

    return {
      ...scores,
      metrics,
      details: {
        timeliness: scores.timelinessDetails,
        completeness: scores.completenessDetails,
        accuracy: scores.accuracyDetails,
      },
    };
  }

  /**
   * Get period date range
   */
  private static getPeriodDates(
    period: string,
    periodType: 'monthly' | 'weekly' | 'daily'
  ): { startDate: Date; endDate: Date } {
    let startDate: Date;
    let endDate: Date;

    if (periodType === 'monthly') {
      // Format: "2024-01"
      const [year, month] = period.split('-').map(Number);
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else if (periodType === 'weekly') {
      // Format: "2024-W01" or "2024-01" (week number)
      const parts = period.split('-W');
      const year = parseInt(parts[0]);
      const week = parseInt(parts[1] || '1');
      const firstDay = new Date(year, 0, 1);
      const days = (week - 1) * 7;
      startDate = new Date(firstDay);
      startDate.setDate(firstDay.getDate() + days - firstDay.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Daily: Format: "2024-01-15"
      const [year, month, day] = period.split('-').map(Number);
      startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  /**
   * Calculate metrics from tasks
   */
  private static calculateMetrics(tasks: OpsTask[]) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === OpsTaskStatus.COMPLETED).length;

    let onTimeCompletions = 0;
    let lateCompletions = 0;
    let missingDataCount = 0;
    let totalErrors = 0;

    const timelinessDetails: any = {
      delays: [] as number[],
    };

    const completenessDetails: any = {
      missingPhotos: 0,
      missingVideos: 0,
      missingLicense: 0,
      missingChecklistItems: 0,
    };

    const accuracyDetails: any = {
      dataEntryErrors: 0,
      verificationErrors: 0,
      otherErrors: 0,
    };

    tasks.forEach((task) => {
      // Timeliness
      if (task.completionDelayMinutes !== undefined && task.completionDelayMinutes !== null) {
        if (task.completionDelayMinutes <= 0) {
          onTimeCompletions++;
        } else {
          lateCompletions++;
          timelinessDetails.delays.push(task.completionDelayMinutes);
        }
      }

      // Completeness
      if (task.requiredPhotos > 0 && (task.uploadedPhotos || 0) < task.requiredPhotos) {
        missingDataCount++;
        completenessDetails.missingPhotos += task.requiredPhotos - (task.uploadedPhotos || 0);
      }

      if (task.requiredVideos > 0 && (task.uploadedVideos || 0) < task.requiredVideos) {
        missingDataCount++;
        completenessDetails.missingVideos += task.requiredVideos - (task.uploadedVideos || 0);
      }

      if (!task.licenseVerified && !task.passportVerified) {
        missingDataCount++;
        completenessDetails.missingLicense++;
      }

      if (
        task.checklistItemsTotal > 0 &&
        (task.checklistItemsCompleted || 0) < task.checklistItemsTotal
      ) {
        missingDataCount++;
        completenessDetails.missingChecklistItems +=
          task.checklistItemsTotal - (task.checklistItemsCompleted || 0);
      }

      // Accuracy
      if (task.hasErrors && task.errorCount > 0) {
        totalErrors += task.errorCount;
        if (task.errorDetails) {
          accuracyDetails.dataEntryErrors += task.errorDetails.dataEntryErrors || 0;
          accuracyDetails.verificationErrors += task.errorDetails.verificationErrors || 0;
          accuracyDetails.otherErrors += task.errorDetails.otherErrors || 0;
        }
      }
    });

    // Calculate average delay
    if (timelinessDetails.delays.length > 0) {
      timelinessDetails.averageDelayMinutes =
        timelinessDetails.delays.reduce((a: number, b: number) => a + b, 0) /
        timelinessDetails.delays.length;
    }

    timelinessDetails.onTimeRate =
      completedTasks > 0 ? (onTimeCompletions / completedTasks) * 100 : 0;
    timelinessDetails.lateRate =
      completedTasks > 0 ? (lateCompletions / completedTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      onTimeCompletions,
      lateCompletions,
      missingDataCount,
      errorCount: tasks.filter((t) => t.hasErrors).length,
      totalErrors,
      timelinessDetails,
      completenessDetails,
      accuracyDetails,
    };
  }

  /**
   * Calculate scores from metrics
   */
  private static calculateScores(metrics: any, tasks: OpsTask[]): any {
    // Timeliness Score (0-100)
    // Base: 100 points
    // Penalty: -2 points per minute late (max -50 points)
    // Bonus: +1 point per minute early (max +10 points)
    let timelinessScore = 100;
    if (metrics.completedTasks > 0) {
      const onTimeRate = (metrics.onTimeCompletions / metrics.completedTasks) * 100;
      timelinessScore = onTimeRate;

      // Apply delay penalties
      if (metrics.timelinessDetails.averageDelayMinutes) {
        const delayPenalty = Math.min(metrics.timelinessDetails.averageDelayMinutes * 0.5, 30);
        timelinessScore = Math.max(0, timelinessScore - delayPenalty);
      }
    }

    // Completeness Score (0-100)
    // Base: 100 points
    // Penalty: -5 points per missing item (photo, video, license, checklist item)
    let completenessScore = 100;
    if (metrics.completedTasks > 0) {
      const missingItems =
        metrics.completenessDetails.missingPhotos +
        metrics.completenessDetails.missingVideos +
        metrics.completenessDetails.missingLicense +
        metrics.completenessDetails.missingChecklistItems;

      const penalty = Math.min(missingItems * 5, 50); // Max 50 point penalty
      completenessScore = Math.max(0, 100 - penalty);
    }

    // Accuracy Score (0-100)
    // Base: 100 points
    // Penalty: -10 points per error (max -50 points)
    let accuracyScore = 100;
    if (metrics.completedTasks > 0) {
      const errorRate = metrics.totalErrors / metrics.completedTasks;
      const penalty = Math.min(errorRate * 10, 50); // Max 50 point penalty
      accuracyScore = Math.max(0, 100 - penalty);
    }

    // Overall Score (weighted average)
    // Timeliness: 30%, Completeness: 40%, Accuracy: 30%
    const overallScore =
      timelinessScore * 0.3 + completenessScore * 0.4 + accuracyScore * 0.3;

    return {
      timelinessScore: Math.round(timelinessScore * 100) / 100,
      completenessScore: Math.round(completenessScore * 100) / 100,
      accuracyScore: Math.round(accuracyScore * 100) / 100,
      overallScore: Math.round(overallScore * 100) / 100,
      timelinessDetails: metrics.timelinessDetails,
      completenessDetails: metrics.completenessDetails,
      accuracyDetails: metrics.accuracyDetails,
    };
  }

  /**
   * Save or update score record
   */
  private static async saveScore(
    userId: string,
    tenantId: string,
    period: string,
    periodType: 'monthly' | 'weekly' | 'daily',
    scores: any,
    metrics: any,
    tasks: OpsTask[]
  ): Promise<StaffPerformanceScore> {
    let scoreRecord = await this.scoreRepo().findOne({
      where: {
        userId,
        tenantId,
        period,
        periodType,
      },
    });

    if (!scoreRecord) {
      scoreRecord = this.scoreRepo().create({
        userId,
        tenantId,
        period,
        periodType,
      });
    }

    // Update scores
    scoreRecord.timelinessScore = scores.timelinessScore;
    scoreRecord.completenessScore = scores.completenessScore;
    scoreRecord.accuracyScore = scores.accuracyScore;
    scoreRecord.overallScore = scores.overallScore;

    // Update metrics
    scoreRecord.totalTasks = metrics.totalTasks;
    scoreRecord.completedTasks = metrics.completedTasks;
    scoreRecord.onTimeCompletions = metrics.onTimeCompletions;
    scoreRecord.lateCompletions = metrics.lateCompletions;
    scoreRecord.missingDataCount = metrics.missingDataCount;
    scoreRecord.errorCount = metrics.errorCount;
    scoreRecord.totalErrors = metrics.totalErrors;

    // Update details
    scoreRecord.timelinessDetails = scores.timelinessDetails;
    scoreRecord.completenessDetails = scores.completenessDetails;
    scoreRecord.accuracyDetails = scores.accuracyDetails;

    scoreRecord.lastCalculatedAt = new Date();

    return this.scoreRepo().save(scoreRecord);
  }

  /**
   * Get scores for a user
   */
  static async getUserScores(
    userId: string,
    tenantId: string,
    periodType: 'monthly' | 'weekly' | 'daily' = 'monthly',
    limit: number = 12
  ): Promise<StaffPerformanceScore[]> {
    return this.scoreRepo().find({
      where: {
        userId,
        tenantId,
        periodType,
      },
      order: {
        period: 'DESC',
      },
      take: limit,
      relations: ['user'],
    });
  }

  /**
   * Get all staff scores for a tenant (admin view)
   */
  static async getTenantScores(
    tenantId: string,
    period: string,
    periodType: 'monthly' | 'weekly' | 'daily' = 'monthly'
  ): Promise<StaffPerformanceScore[]> {
    return this.scoreRepo().find({
      where: {
        tenantId,
        period,
        periodType,
      },
      order: {
        overallScore: 'DESC',
      },
      relations: ['user'],
    });
  }

  /**
   * Recalculate all scores for a period
   */
  static async recalculatePeriod(
    tenantId: string,
    period: string,
    periodType: 'monthly' | 'weekly' | 'daily' = 'monthly'
  ): Promise<void> {
    // Get all users who completed tasks in this period
    const { startDate, endDate } = this.getPeriodDates(period, periodType);

    const tasks = await this.taskRepo().find({
      where: {
        tenantId,
        completedAt: Between(startDate, endDate),
        status: OpsTaskStatus.COMPLETED,
      },
      select: ['completedByUserId'],
    });

    const userIds = [...new Set(tasks.map((t) => t.completedByUserId).filter(Boolean))] as string[];

    // Calculate scores for each user
    for (const userId of userIds) {
      await this.calculateScore(userId, tenantId, period, periodType);
    }
  }
}


import { Repository, Between } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { OpsTask, OpsTaskType, OpsTaskStatus } from '../entities/ops-task.entity';
import { Reservation, ReservationType, ReservationStatus } from '../../shared/entities/reservation.entity';
import { VehicleReservationAssignment } from '../../rentacar/entities/vehicle-reservation-assignment.entity';
import { VehiclePlate } from '../../rentacar/entities/vehicle-plate.entity';
import { Vehicle } from '../../rentacar/entities/vehicle.entity';
import { StaffPerformanceService } from './staff-performance.service';

export type CreateOpsTaskInput = {
  reservationId: string;
  type: OpsTaskType;
};

export type UpdateOpsTaskMediaInput = {
  mediaIds: string[];
};

export type VerifyDocsInput = {
  licenseVerified: boolean;
  licenseMediaIds?: string[];
  passportVerified: boolean;
  passportMediaIds?: string[];
};

export type FinalizeReturnInput = {
  fuelLevel?: number;
  mileage?: number;
  damageNotes?: string;
  damageMediaIds?: string[];
};

export class OpsTaskService {
  private static taskRepo(): Repository<OpsTask> {
    return AppDataSource.getRepository(OpsTask);
  }

  private static reservationRepo(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  /**
   * Get tasks for a tenant with optional filters
   */
  static async getTasks(
    tenantId: string,
    filters: {
      type?: OpsTaskType;
      status?: OpsTaskStatus;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<OpsTask[]> {
    const query = this.taskRepo()
      .createQueryBuilder('task')
      .leftJoinAndSelect(Reservation, 'reservation', 'reservation.id = task.reservationId')
      .where('task.tenantId = :tenantId', { tenantId });

    if (filters.type) {
      query.andWhere('task.type = :type', { type: filters.type });
    }

    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom) {
        query.andWhere('reservation.checkIn >= :dateFrom', { dateFrom: filters.dateFrom });
      }
      if (filters.dateTo) {
        query.andWhere('reservation.checkIn <= :dateTo', { dateTo: filters.dateTo });
      }
    }

    return query.orderBy('task.createdAt', 'DESC').getMany();
  }

  /**
   * Get task by ID with full relations
   */
  static async getTaskById(id: string, tenantId: string): Promise<OpsTask | null> {
    return this.taskRepo().findOne({
      where: { id, tenantId },
      relations: ['reservation'],
    });
  }

  /**
   * Create or get existing task
   */
  static async createOrGetTask(input: CreateOpsTaskInput, tenantId: string): Promise<OpsTask> {
    // Verify reservation exists and belongs to tenant
    const reservation = await this.reservationRepo().findOne({
      where: { id: input.reservationId, tenantId, type: ReservationType.RENTACAR },
    });

    if (!reservation) {
      throw new Error('Reservation not found or invalid type');
    }

    // Check if task already exists
    const existing = await this.taskRepo().findOne({
      where: {
        reservationId: input.reservationId,
        type: input.type,
        tenantId,
      },
    });

    if (existing) {
      return existing;
    }

    // Create new task
    const task = this.taskRepo().create({
      tenantId,
      reservationId: input.reservationId,
      type: input.type,
      status: OpsTaskStatus.PENDING,
    });

    return this.taskRepo().save(task);
  }

  /**
   * Update task media
   */
  static async updateMedia(id: string, tenantId: string, input: UpdateOpsTaskMediaInput): Promise<OpsTask> {
    const task = await this.getTaskById(id, tenantId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.mediaIds = input.mediaIds;
    return this.taskRepo().save(task);
  }

  /**
   * Verify documents
   */
  static async verifyDocs(id: string, tenantId: string, input: VerifyDocsInput): Promise<OpsTask> {
    const task = await this.getTaskById(id, tenantId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.licenseVerified = input.licenseVerified;
    task.licenseMediaIds = input.licenseMediaIds || [];
    task.passportVerified = input.passportVerified;
    task.passportMediaIds = input.passportMediaIds || [];

    return this.taskRepo().save(task);
  }

  /**
   * Finalize checkout
   */
  static async finalizeCheckout(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<{ printPayload: any; pdfUrl?: string }> {
    const task = await this.getTaskById(id, tenantId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.type !== OpsTaskType.CHECKOUT) {
      throw new Error('Task is not a checkout task');
    }

    // Validate required media
    if (!task.mediaIds || task.mediaIds.length < 8) {
      throw new Error('At least 8 photos are required for checkout');
    }

    // Validate documents
    if (!task.licenseVerified) {
      throw new Error('Driver license must be verified');
    }

    // Calculate performance metrics before completion
    const reservation = await this.reservationRepo().findOne({
      where: { id: task.reservationId },
    });

    // Calculate timeliness
    if (reservation && reservation.checkIn) {
      const scheduledTime = new Date(reservation.checkIn);
      const completedTime = new Date();
      const delayMinutes = Math.round((completedTime.getTime() - scheduledTime.getTime()) / (1000 * 60));
      task.completionDelayMinutes = delayMinutes;
      task.scheduledStartTime = scheduledTime;
    }

    // Calculate completeness metrics
    task.requiredPhotos = 8; // Minimum required
    task.uploadedPhotos = task.mediaIds?.length || 0;
    task.requiredVideos = 0; // Optional for checkout
    task.uploadedVideos = 0;

    // Checklist tracking (if provided)
    if (!task.checklistCompleted) {
      task.checklistCompleted = true; // Assume completed if finalizing
      task.checklistItemsTotal = 10; // Default checklist items
      task.checklistItemsCompleted = 10;
    }

    // Update task status
    task.status = OpsTaskStatus.COMPLETED;
    task.completedByUserId = userId;
    task.completedAt = new Date();

    // Update reservation check-in
    if (reservation) {
      reservation.checkIn = new Date();
      reservation.status = ReservationStatus.CONFIRMED;
      await this.reservationRepo().save(reservation);
    }

    await this.taskRepo().save(task);

    // Trigger score calculation (async, don't wait)
    this.updatePerformanceScore(userId, tenantId).catch(console.error);

    // Generate print payload
    const printPayload = await this.generatePrintPayload(task);

    return { printPayload };
  }

  /**
   * Finalize return
   */
  static async finalizeReturn(
    id: string,
    tenantId: string,
    userId: string,
    input: FinalizeReturnInput
  ): Promise<void> {
    const task = await this.getTaskById(id, tenantId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.type !== OpsTaskType.RETURN) {
      throw new Error('Task is not a return task');
    }

    // Update return-specific fields
    task.returnFuelLevel = input.fuelLevel;
    task.returnMileage = input.mileage;
    task.returnDamageNotes = input.damageNotes;
    task.returnDamageMediaIds = input.damageMediaIds || [];

    // Calculate performance metrics
    const reservation = await this.reservationRepo().findOne({
      where: { id: task.reservationId },
    });

    // Calculate timeliness
    if (reservation && reservation.checkOut) {
      const scheduledTime = new Date(reservation.checkOut);
      const completedTime = new Date();
      const delayMinutes = Math.round((completedTime.getTime() - scheduledTime.getTime()) / (1000 * 60));
      task.completionDelayMinutes = delayMinutes;
      task.scheduledStartTime = scheduledTime;
    }

    // Calculate completeness metrics
    task.requiredPhotos = 4; // Minimum for return
    task.uploadedPhotos = (task.returnDamageMediaIds?.length || 0) + (task.mediaIds?.length || 0);
    task.requiredVideos = 0;
    task.uploadedVideos = 0;

    // Checklist tracking
    if (!task.checklistCompleted) {
      task.checklistCompleted = true;
      task.checklistItemsTotal = 8; // Return checklist items
      task.checklistItemsCompleted = 8;
    }

    // Update task status
    task.status = OpsTaskStatus.COMPLETED;
    task.completedByUserId = userId;
    task.completedAt = new Date();

    // Update reservation check-out
    if (reservation) {
      reservation.checkOut = new Date();
      reservation.status = ReservationStatus.COMPLETED;
      await this.reservationRepo().save(reservation);
    }

    await this.taskRepo().save(task);

    // Trigger score calculation (async, don't wait)
    this.updatePerformanceScore(userId, tenantId).catch(console.error);
  }

  /**
   * Generate print payload for thermal printer
   */
  static async generatePrintPayload(task: OpsTask): Promise<any> {
    const reservation = await this.reservationRepo().findOne({
      where: { id: task.reservationId },
      relations: ['tenant'],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Get vehicle info from assignment
    const assignmentRepo = AppDataSource.getRepository(VehicleReservationAssignment);
    const assignment = await assignmentRepo.findOne({
      where: { reservationId: reservation.id },
      relations: ['plate', 'plate.vehicle', 'plate.vehicle.brand', 'plate.vehicle.model'],
    });

    const vehicle = assignment?.plate?.vehicle;
    const plate = assignment?.plate;

    // Build print lines (ESC/POS format)
    const lines: Array<{ text: string; align?: 'left' | 'center' | 'right'; bold?: boolean; size?: number }> = [
      { text: '================================', align: 'center', bold: true },
      { text: reservation.tenant?.name || 'RENTAL AGREEMENT', align: 'center', bold: true, size: 2 },
      { text: '================================', align: 'center', bold: true },
      { text: '' },
      { text: `Reference: ${reservation.reference}`, bold: true },
      { text: `Date: ${new Date().toLocaleDateString('tr-TR')}`, bold: true },
      { text: '' },
      { text: 'CUSTOMER INFORMATION', bold: true },
      { text: `Name: ${reservation.customerName}`, bold: true },
      { text: '' },
      { text: 'VEHICLE INFORMATION', bold: true },
    ];

    if (vehicle) {
      lines.push({ text: `Vehicle: ${vehicle.brand?.name || vehicle.brandName || 'N/A'} ${vehicle.model?.name || vehicle.modelName || 'N/A'}` });
      if (vehicle.year) {
        lines.push({ text: `Year: ${vehicle.year}` });
      }
    }

    if (plate) {
      lines.push({ text: `Plate: ${plate.plateNumber}`, bold: true });
    }

    lines.push(
      { text: '' },
      { text: 'RENTAL PERIOD', bold: true },
      { text: `From: ${reservation.checkIn ? new Date(reservation.checkIn).toLocaleString('tr-TR') : 'N/A'}` },
      { text: `To: ${reservation.checkOut ? new Date(reservation.checkOut).toLocaleString('tr-TR') : 'N/A'}` },
      { text: '' },
      { text: 'TERMS AND CONDITIONS', bold: true },
      { text: '1. Vehicle must be returned in same condition', size: 0 },
      { text: '2. Fuel level must match return level', size: 0 },
      { text: '3. Any damages will be charged', size: 0 },
      { text: '' },
      { text: 'Customer Signature:', bold: true },
      { text: '' },
      { text: '' },
      { text: '================================', align: 'center' },
      { text: 'Thank you for your business!', align: 'center' },
      { text: '================================', align: 'center' }
    );

    return {
      lines,
      reservationId: reservation.id,
      reference: reservation.reference,
    };
  }

  /**
   * Start task (track start time for timeliness)
   */
  static async startTask(id: string, tenantId: string, userId: string): Promise<OpsTask> {
    const task = await this.getTaskById(id, tenantId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== OpsTaskStatus.PENDING) {
      throw new Error('Task is not in pending status');
    }

    task.status = OpsTaskStatus.IN_PROGRESS;
    task.actualStartTime = new Date();

    // Set scheduled time if not set
    if (!task.scheduledStartTime) {
      const reservation = await this.reservationRepo().findOne({
        where: { id: task.reservationId },
      });
      if (reservation) {
        task.scheduledStartTime = task.type === OpsTaskType.CHECKOUT
          ? (reservation.checkIn ? new Date(reservation.checkIn) : new Date())
          : (reservation.checkOut ? new Date(reservation.checkOut) : new Date());
      }
    }

    return this.taskRepo().save(task);
  }

  /**
   * Update task checklist progress
   */
  static async updateChecklist(
    id: string,
    tenantId: string,
    input: { itemsTotal: number; itemsCompleted: number }
  ): Promise<OpsTask> {
    const task = await this.getTaskById(id, tenantId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.checklistItemsTotal = input.itemsTotal;
    task.checklistItemsCompleted = input.itemsCompleted;
    task.checklistCompleted = input.itemsCompleted >= input.itemsTotal;

    return this.taskRepo().save(task);
  }

  /**
   * Update task media counts
   */
  static async updateMediaCounts(
    id: string,
    tenantId: string,
    input: {
      requiredPhotos?: number;
      uploadedPhotos?: number;
      requiredVideos?: number;
      uploadedVideos?: number;
    }
  ): Promise<OpsTask> {
    const task = await this.getTaskById(id, tenantId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (input.requiredPhotos !== undefined) task.requiredPhotos = input.requiredPhotos;
    if (input.uploadedPhotos !== undefined) task.uploadedPhotos = input.uploadedPhotos;
    if (input.requiredVideos !== undefined) task.requiredVideos = input.requiredVideos;
    if (input.uploadedVideos !== undefined) task.uploadedVideos = input.uploadedVideos;

    return this.taskRepo().save(task);
  }

  /**
   * Record task error
   */
  static async recordError(
    id: string,
    tenantId: string,
    input: {
      errorType: 'dataEntry' | 'verification' | 'other';
      description?: string;
    }
  ): Promise<OpsTask> {
    const task = await this.getTaskById(id, tenantId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.hasErrors = true;
    task.errorCount = (task.errorCount || 0) + 1;

    if (!task.errorDetails) {
      task.errorDetails = {
        dataEntryErrors: 0,
        verificationErrors: 0,
        otherErrors: 0,
        descriptions: [],
      };
    }

    if (input.errorType === 'dataEntry') {
      task.errorDetails.dataEntryErrors = (task.errorDetails.dataEntryErrors || 0) + 1;
    } else if (input.errorType === 'verification') {
      task.errorDetails.verificationErrors = (task.errorDetails.verificationErrors || 0) + 1;
    } else {
      task.errorDetails.otherErrors = (task.errorDetails.otherErrors || 0) + 1;
    }

    if (input.description) {
      task.errorDetails.descriptions = task.errorDetails.descriptions || [];
      task.errorDetails.descriptions.push(input.description);
    }

    return this.taskRepo().save(task);
  }

  /**
   * Update performance score for user (async helper)
   */
  private static async updatePerformanceScore(userId: string, tenantId: string): Promise<void> {
    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await StaffPerformanceService.calculateScore(userId, tenantId, period, 'monthly');
    } catch (error) {
      console.error('Failed to update performance score:', error);
    }
  }
}


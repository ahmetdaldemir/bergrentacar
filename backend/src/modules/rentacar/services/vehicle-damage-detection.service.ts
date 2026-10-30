import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { VehicleDamageDetection, DetectionStatus } from '../entities/vehicle-damage-detection.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Reservation } from '../../shared/entities/reservation.entity';
import { detectVehicleDamage } from '../../../utils/image-damage-detector';
import path from 'path';
import fs from 'fs';
import { getUploadsDir } from '../../shared/controllers/file-upload.controller';

export type CreateDamageDetectionInput = {
  vehicleId: string;
  reservationId: string;
  checkinPhotoUrls: string[];
  checkoutPhotoUrls: string[];
};

export class VehicleDamageDetectionService {
  private static detectionRepo(): Repository<VehicleDamageDetection> {
    return AppDataSource.getRepository(VehicleDamageDetection);
  }

  private static vehicleRepo(): Repository<Vehicle> {
    return AppDataSource.getRepository(Vehicle);
  }

  private static reservationRepo(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  /**
   * Process damage detection for a reservation
   * Compares check-in and check-out photos
   */
  static async processDetection(
    input: CreateDamageDetectionInput,
    tenantId: string
  ): Promise<VehicleDamageDetection> {
    // Verify vehicle and reservation exist and belong to tenant
    const vehicle = await this.vehicleRepo().findOne({
      where: { id: input.vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const reservation = await this.reservationRepo().findOne({
      where: { id: input.reservationId, tenantId },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Check if detection already exists
    let detection = await this.detectionRepo().findOne({
      where: {
        vehicleId: input.vehicleId,
        reservationId: input.reservationId,
        tenantId,
      },
    });

    if (detection) {
      // Update existing detection
      detection.status = DetectionStatus.PROCESSING;
      detection.checkinPhotoUrls = input.checkinPhotoUrls;
      detection.checkoutPhotoUrls = input.checkoutPhotoUrls;
      await this.detectionRepo().save(detection);
    } else {
      // Create new detection
      detection = this.detectionRepo().create({
        tenantId,
        vehicleId: input.vehicleId,
        reservationId: input.reservationId,
        checkinPhotoUrls: input.checkinPhotoUrls,
        checkoutPhotoUrls: input.checkoutPhotoUrls,
        status: DetectionStatus.PROCESSING,
        damageProbability: 0,
        confidenceScore: 0,
      });
      detection = await this.detectionRepo().save(detection);
    }

    try {
      // Process first pair of photos (check-in vs check-out)
      // In production, you might want to process all pairs and aggregate results
      if (input.checkinPhotoUrls.length > 0 && input.checkoutPhotoUrls.length > 0) {
        const checkinUrl = input.checkinPhotoUrls[0];
        const checkoutUrl = input.checkoutPhotoUrls[0];

        // Convert URLs to file paths
        const uploadsDir = getUploadsDir();
        const checkinPath = path.join(uploadsDir, checkinUrl.replace('/uploads/', ''));
        const checkoutPath = path.join(uploadsDir, checkoutUrl.replace('/uploads/', ''));

        if (!fs.existsSync(checkinPath) || !fs.existsSync(checkoutPath)) {
          throw new Error('Photo files not found');
        }

        // Generate difference image path
        const diffFilename = `damage-diff-${detection.id}-${Date.now()}.jpg`;
        const diffPath = path.join(uploadsDir, diffFilename);

        // Run damage detection
        const result = await detectVehicleDamage(checkinPath, checkoutPath, diffPath);

        // Update detection with results
        detection.damageProbability = result.damageProbability;
        detection.confidenceScore = result.confidenceScore;
        detection.damagedAreas = result.damagedAreas;
        detection.differenceImageUrl = `/uploads/${diffFilename}`;
        detection.processingMetadata = result.processingMetadata;
        detection.status = DetectionStatus.COMPLETED;
      } else {
        throw new Error('Both check-in and check-out photos are required');
      }

      await this.detectionRepo().save(detection);
      return detection;
    } catch (error) {
      detection.status = DetectionStatus.FAILED;
      detection.errorMessage = (error as Error).message;
      await this.detectionRepo().save(detection);
      throw error;
    }
  }

  /**
   * Get detection by ID
   */
  static async getById(id: string, tenantId: string): Promise<VehicleDamageDetection | null> {
    return this.detectionRepo().findOne({
      where: { id, tenantId },
      relations: ['vehicle', 'reservation'],
    });
  }

  /**
   * Get detections for a vehicle
   */
  static async getByVehicle(vehicleId: string, tenantId: string): Promise<VehicleDamageDetection[]> {
    return this.detectionRepo().find({
      where: { vehicleId, tenantId },
      relations: ['reservation'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get detection for a reservation
   */
  static async getByReservation(
    reservationId: string,
    tenantId: string
  ): Promise<VehicleDamageDetection | null> {
    return this.detectionRepo().findOne({
      where: { reservationId, tenantId },
      relations: ['vehicle', 'reservation'],
    });
  }

  /**
   * Verify detection (human verification)
   */
  static async verifyDetection(
    id: string,
    tenantId: string,
    userId: string,
    isDamage: boolean,
    notes?: string
  ): Promise<VehicleDamageDetection> {
    const detection = await this.detectionRepo().findOne({
      where: { id, tenantId },
    });

    if (!detection) {
      throw new Error('Detection not found');
    }

    detection.verifiedByUserId = userId;
    detection.verifiedAt = new Date();
    detection.verificationNotes = notes;
    detection.status = isDamage ? DetectionStatus.VERIFIED : DetectionStatus.FALSE_POSITIVE;

    return this.detectionRepo().save(detection);
  }
}


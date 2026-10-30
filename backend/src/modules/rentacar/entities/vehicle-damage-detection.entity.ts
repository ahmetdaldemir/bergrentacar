import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Vehicle } from './vehicle.entity';
import { Reservation } from '../../shared/entities/reservation.entity';

export enum DetectionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  VERIFIED = 'verified', // Human verified
  FALSE_POSITIVE = 'false_positive', // Human marked as false positive
}

@Entity({ name: 'vehicle_damage_detections' })
@Index(['vehicleId', 'reservationId'])
@Index(['tenantId', 'vehicleId'])
@Index(['reservationId'])
export class VehicleDamageDetection extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Vehicle, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;

  @ManyToOne(() => Reservation, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  @Column({ name: 'reservation_id' })
  reservationId!: string;

  // Check-in photo URLs (array of image URLs)
  @Column({ name: 'checkin_photo_urls', type: 'jsonb' })
  checkinPhotoUrls!: string[];

  // Check-out photo URLs (array of image URLs)
  @Column({ name: 'checkout_photo_urls', type: 'jsonb' })
  checkoutPhotoUrls!: string[];

  // Detection results
  @Column({ name: 'damage_probability', type: 'decimal', precision: 5, scale: 2 })
  damageProbability!: number; // 0-100

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2 })
  confidenceScore!: number; // 0-100

  @Column({ type: 'enum', enum: DetectionStatus, default: DetectionStatus.PENDING })
  status!: DetectionStatus;

  // Detected damage areas (array of regions with coordinates)
  @Column({ name: 'damaged_areas', type: 'jsonb', nullable: true })
  damagedAreas?: Array<{
    x: number; // Top-left X coordinate (0-1 normalized)
    y: number; // Top-left Y coordinate (0-1 normalized)
    width: number; // Width (0-1 normalized)
    height: number; // Height (0-1 normalized)
    confidence: number; // 0-100
    type?: string; // 'scratch', 'dent', 'crack', 'other'
  }>;

  // Difference image URL (overlay showing differences)
  @Column({ name: 'difference_image_url', type: 'varchar', length: 500, nullable: true })
  differenceImageUrl?: string;

  // Processing metadata
  @Column({ name: 'processing_metadata', type: 'jsonb', nullable: true })
  processingMetadata?: {
    pixelDifference?: number; // Percentage of different pixels
    edgeDifference?: number; // Edge difference score
    processingTime?: number; // Milliseconds
    imageDimensions?: {
      width: number;
      height: number;
    };
  };

  // Human verification
  @Column({ name: 'verified_by_user_id', type: 'uuid', nullable: true })
  verifiedByUserId?: string;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date | null;

  @Column({ name: 'verification_notes', type: 'text', nullable: true })
  verificationNotes?: string;

  // Error information
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;
}


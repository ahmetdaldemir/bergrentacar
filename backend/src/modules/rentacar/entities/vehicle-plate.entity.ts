import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Vehicle } from './vehicle.entity';
import { Location } from './location.entity';

@Entity({ name: 'vehicle_plates' })
@Unique(['plateNumber'])
export class VehiclePlate extends BaseEntity {
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.plates, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;

  @Column({ name: 'plate_number', length: 20 })
  plateNumber!: string;

  @Column({ name: 'registration_date', type: 'date', nullable: true })
  registrationDate?: Date;

  @Column({ name: 'document_number', length: 100, nullable: true })
  documentNumber?: string;

  @Column({ name: 'serial_number', length: 100, nullable: true })
  serialNumber?: string;

  @Column({ type: 'int', nullable: true })
  km?: number;

  @Column({ name: 'oil_km', type: 'int', nullable: true })
  oilKm?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Insurance and Inspection Information
  @Column({ name: 'comprehensive_insurance_company', length: 200, nullable: true })
  comprehensiveInsuranceCompany?: string;

  @Column({ name: 'comprehensive_insurance_start', type: 'date', nullable: true })
  comprehensiveInsuranceStart?: Date;

  @Column({ name: 'comprehensive_insurance_end', type: 'date', nullable: true })
  comprehensiveInsuranceEnd?: Date;

  @Column({ name: 'traffic_insurance_company', length: 200, nullable: true })
  trafficInsuranceCompany?: string;

  @Column({ name: 'traffic_insurance_start', type: 'date', nullable: true })
  trafficInsuranceStart?: Date;

  @Column({ name: 'traffic_insurance_end', type: 'date', nullable: true })
  trafficInsuranceEnd?: Date;

  @Column({ name: 'inspection_company', length: 200, nullable: true })
  inspectionCompany?: string;

  @Column({ name: 'inspection_start', type: 'date', nullable: true })
  inspectionStart?: Date;

  @Column({ name: 'inspection_end', type: 'date', nullable: true })
  inspectionEnd?: Date;

  @Column({ name: 'exhaust_inspection_company', length: 200, nullable: true })
  exhaustInspectionCompany?: string;

  @Column({ name: 'exhaust_inspection_start', type: 'date', nullable: true })
  exhaustInspectionStart?: Date;

  @Column({ name: 'exhaust_inspection_end', type: 'date', nullable: true })
  exhaustInspectionEnd?: Date;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'last_return_location_id' })
  lastReturnLocation?: Location | null;

  @Column({ name: 'last_return_location_id', nullable: true })
  lastReturnLocationId?: string | null;
}

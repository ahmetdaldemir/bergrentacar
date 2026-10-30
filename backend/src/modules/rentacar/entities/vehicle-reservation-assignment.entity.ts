import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Reservation } from '../../shared/entities/reservation.entity';
import { VehiclePlate } from './vehicle-plate.entity';

@Entity({ name: 'vehicle_reservation_assignments' })
export class VehicleReservationAssignment extends BaseEntity {
  @ManyToOne(() => Reservation, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  @Column({ name: 'reservation_id' })
  reservationId!: string;

  @ManyToOne(() => VehiclePlate, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_plate_id' })
  plate!: VehiclePlate;

  @Column({ name: 'vehicle_plate_id' })
  plateId!: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date;
}

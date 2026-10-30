import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransferVehicleTrackingPlate1742000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transfer_vehicles"
      ADD COLUMN IF NOT EXISTS "tracking_plate_number" character varying(32) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transfer_vehicles" DROP COLUMN IF EXISTS "tracking_plate_number"`);
  }
}

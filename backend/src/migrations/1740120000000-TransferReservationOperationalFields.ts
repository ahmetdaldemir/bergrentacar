import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransferReservationOperationalFields1740120000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transfer_reservations"
      ADD COLUMN IF NOT EXISTS "payment_collection_by" character varying(20) NOT NULL DEFAULT 'pending'
    `);
    await queryRunner.query(`
      ALTER TABLE "transfer_reservations"
      ADD COLUMN IF NOT EXISTS "driver_cash_confirmed_at" TIMESTAMP WITH TIME ZONE NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "transfer_reservations"
      ADD COLUMN IF NOT EXISTS "driver_cash_amount" numeric(12,2) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "transfer_reservations"
      ADD COLUMN IF NOT EXISTS "driver_cash_currency" character varying(3) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transfer_reservations" DROP COLUMN IF EXISTS "driver_cash_currency"`);
    await queryRunner.query(`ALTER TABLE "transfer_reservations" DROP COLUMN IF EXISTS "driver_cash_amount"`);
    await queryRunner.query(`ALTER TABLE "transfer_reservations" DROP COLUMN IF EXISTS "driver_cash_confirmed_at"`);
    await queryRunner.query(`ALTER TABLE "transfer_reservations" DROP COLUMN IF EXISTS "payment_collection_by"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransferReservationDriverCashCollectedTotal1741000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transfer_reservations"
      ADD COLUMN IF NOT EXISTS "driver_cash_collected_total" numeric(12,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "transfer_reservations"
      SET "driver_cash_collected_total" = "total_price"
      WHERE "driver_cash_confirmed_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transfer_reservations" DROP COLUMN IF EXISTS "driver_cash_collected_total"`
    );
  }
}

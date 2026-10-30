import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHotelDescriptionLocation1699638400000 implements MigrationInterface {
  name = 'AddHotelDescriptionLocation1699638400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('hotels');

    if (!table?.findColumnByName('description')) {
      await queryRunner.query(`ALTER TABLE "hotels" ADD COLUMN "description" text`);
    }
    if (!table?.findColumnByName('location_url')) {
      await queryRunner.query(`ALTER TABLE "hotels" ADD COLUMN "location_url" character varying(255)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('hotels');

    if (table?.findColumnByName('description')) {
      await queryRunner.query(`ALTER TABLE "hotels" DROP COLUMN "description"`);
    }
    if (table?.findColumnByName('location_url')) {
      await queryRunner.query(`ALTER TABLE "hotels" DROP COLUMN "location_url"`);
    }
  }
}

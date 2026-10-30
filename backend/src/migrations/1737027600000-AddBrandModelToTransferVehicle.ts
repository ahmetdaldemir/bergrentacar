import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddBrandModelToTransferVehicle1737027600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add brand_id column
    await queryRunner.addColumn(
      'transfer_vehicles',
      new TableColumn({
        name: 'brand_id',
        type: 'uuid',
        isNullable: true,
      })
    );

    // Add model_id column
    await queryRunner.addColumn(
      'transfer_vehicles',
      new TableColumn({
        name: 'model_id',
        type: 'uuid',
        isNullable: true,
      })
    );

    // Add year column
    await queryRunner.addColumn(
      'transfer_vehicles',
      new TableColumn({
        name: 'year',
        type: 'integer',
        isNullable: true,
      })
    );

    // Add foreign key for brand_id
    await queryRunner.createForeignKey(
      'transfer_vehicles',
      new TableForeignKey({
        columnNames: ['brand_id'],
        referencedTableName: 'vehicle_brands',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Add foreign key for model_id
    await queryRunner.createForeignKey(
      'transfer_vehicles',
      new TableForeignKey({
        columnNames: ['model_id'],
        referencedTableName: 'vehicle_models',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign keys
    const table = await queryRunner.getTable('transfer_vehicles');
    if (table) {
      const brandForeignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('brand_id') !== -1);
      if (brandForeignKey) {
        await queryRunner.dropForeignKey('transfer_vehicles', brandForeignKey);
      }

      const modelForeignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('model_id') !== -1);
      if (modelForeignKey) {
        await queryRunner.dropForeignKey('transfer_vehicles', modelForeignKey);
      }
    }

    // Drop columns
    await queryRunner.dropColumn('transfer_vehicles', 'year');
    await queryRunner.dropColumn('transfer_vehicles', 'model_id');
    await queryRunner.dropColumn('transfer_vehicles', 'brand_id');
  }
}

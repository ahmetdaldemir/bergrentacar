import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddImageAndShowOnSiteToCountries1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add image column
    await queryRunner.addColumn(
      'countries',
      new TableColumn({
        name: 'image',
        type: 'text',
        isNullable: true,
      })
    );

    // Add show_on_site column
    await queryRunner.addColumn(
      'countries',
      new TableColumn({
        name: 'show_on_site',
        type: 'boolean',
        default: false,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns
    await queryRunner.dropColumn('countries', 'show_on_site');
    await queryRunner.dropColumn('countries', 'image');
  }
}

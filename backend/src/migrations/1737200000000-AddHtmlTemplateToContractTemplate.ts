import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddHtmlTemplateToContractTemplate1737200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'contract_templates',
      new TableColumn({
        name: 'html_template',
        type: 'text',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('contract_templates', 'html_template');
  }
}

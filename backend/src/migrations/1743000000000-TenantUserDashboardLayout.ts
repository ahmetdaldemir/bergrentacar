import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class TenantUserDashboardLayout1743000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'tenant_users',
      new TableColumn({
        name: 'dashboard_layout',
        type: 'jsonb',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('tenant_users', 'dashboard_layout');
  }
}

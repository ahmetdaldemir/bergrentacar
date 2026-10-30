import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { Tenant } from '../modules/tenants/entities/tenant.entity';

async function fixDestinationsTenantSync() {
  let queryRunner: any = null;
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // Get first available tenant
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const firstTenant = await tenantRepo.findOne({ 
      order: { createdAt: 'ASC' } 
    });

    if (!firstTenant) {
      console.error('❌ No tenant found in database. Please create a tenant first.');
      await queryRunner.release();
      await AppDataSource.destroy();
      process.exit(1);
    }

    const TENANT_ID = firstTenant.id;
    console.log(`📋 Using tenant ID: ${TENANT_ID} (${firstTenant.name || firstTenant.slug})`);

    // Check if tenant_id column exists
    const table = await queryRunner.getTable('destinations');
    const tenantIdColumn = table?.findColumnByName('tenant_id');

    if (!tenantIdColumn) {
      console.log('⚠️  tenant_id column does not exist yet. It will be added by synchronize.');
      await queryRunner.release();
      await AppDataSource.destroy();
      process.exit(0);
    }

    // Check if there are NULL values
    const nullCountResult = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM destinations 
      WHERE tenant_id IS NULL
    `);
    const nullCount = parseInt(nullCountResult[0].count);

    if (nullCount === 0) {
      console.log('✅ All destinations already have tenant_id');
      
      // Check if column is nullable
      if (tenantIdColumn.isNullable) {
        console.log('🔄 Setting tenant_id to NOT NULL...');
        
        // First, ensure all records have tenant_id
        await queryRunner.query(`
          UPDATE destinations 
          SET tenant_id = $1 
          WHERE tenant_id IS NULL
        `, [TENANT_ID]);
        
        // Then set to NOT NULL
        await queryRunner.query(`
          ALTER TABLE destinations 
          ALTER COLUMN tenant_id SET NOT NULL
        `);
        
        console.log('✅ tenant_id column set to NOT NULL');
      } else {
        console.log('✅ tenant_id column is already NOT NULL');
      }
    } else {
      console.log(`📝 Found ${nullCount} destination(s) with NULL tenant_id`);
      
      // Temporarily disable foreign key constraint if it exists
      const foreignKeys = table?.foreignKeys || [];
      const fkExists = foreignKeys.some((fk: any) =>
        fk.columnNames.includes('tenant_id') && fk.referencedTableName === 'tenants'
      );

      if (fkExists) {
        console.log('🔄 Temporarily disabling foreign key constraint...');
        const fk = foreignKeys.find((fk: any) =>
          fk.columnNames.includes('tenant_id') && fk.referencedTableName === 'tenants'
        );
        if (fk) {
          await queryRunner.query(`
            ALTER TABLE destinations 
            DROP CONSTRAINT ${fk.name}
          `);
          console.log('✅ Foreign key constraint temporarily disabled');
        }
      }
      
      // Update NULL values
      await queryRunner.query(`
        UPDATE destinations 
        SET tenant_id = $1 
        WHERE tenant_id IS NULL
      `, [TENANT_ID]);
      
      console.log(`✅ Updated ${nullCount} destination(s) with tenant_id`);
      
      // Re-add foreign key constraint if it was removed
      if (fkExists) {
        console.log('🔄 Re-adding foreign key constraint...');
        await queryRunner.query(`
          ALTER TABLE destinations 
          ADD CONSTRAINT FK_destinations_tenant_id 
          FOREIGN KEY (tenant_id) 
          REFERENCES tenants(id) 
          ON DELETE CASCADE
        `);
        console.log('✅ Foreign key constraint re-added');
      }
      
      // If column is nullable, set to NOT NULL
      if (tenantIdColumn.isNullable) {
        console.log('🔄 Setting tenant_id to NOT NULL...');
        await queryRunner.query(`
          ALTER TABLE destinations 
          ALTER COLUMN tenant_id SET NOT NULL
        `);
        console.log('✅ tenant_id column set to NOT NULL');
      }
    }

    // Ensure foreign key constraint exists
    const finalTable = await queryRunner.getTable('destinations');
    const finalForeignKeys = finalTable?.foreignKeys || [];
    const finalFkExists = finalForeignKeys.some((fk: any) =>
      fk.columnNames.includes('tenant_id') && fk.referencedTableName === 'tenants'
    );

    if (!finalFkExists) {
      console.log('🔄 Adding foreign key constraint...');
      await queryRunner.query(`
        ALTER TABLE destinations 
        ADD CONSTRAINT FK_destinations_tenant_id 
        FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) 
        ON DELETE CASCADE
      `);
      console.log('✅ Foreign key constraint added');
    } else {
      console.log('✅ Foreign key constraint already exists');
    }

    await queryRunner.release();
    console.log('✅ Done');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error);
    if (queryRunner) {
      try {
        await queryRunner.release();
      } catch (e) {
        // Ignore release errors
      }
    }
    try {
      await AppDataSource.destroy();
    } catch (e) {
      // Ignore destroy errors
    }
    process.exit(1);
  }
}

fixDestinationsTenantSync();


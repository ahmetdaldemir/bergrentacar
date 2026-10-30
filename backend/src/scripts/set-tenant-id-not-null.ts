import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';

async function setTenantIdNotNull() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Set tenant_id to NOT NULL
    await AppDataSource.query(`
      ALTER TABLE destinations 
      ALTER COLUMN tenant_id SET NOT NULL
    `);

    console.log('✅ tenant_id column set to NOT NULL');

    // Add foreign key constraint if it doesn't exist
    try {
      await AppDataSource.query(`
        ALTER TABLE destinations 
        ADD CONSTRAINT FK_destinations_tenant_id 
        FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) 
        ON DELETE CASCADE
      `);
      console.log('✅ Foreign key constraint added');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  Foreign key constraint already exists');
      } else {
        throw error;
      }
    }

    await AppDataSource.destroy();
    console.log('✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

setTenantIdNotNull();


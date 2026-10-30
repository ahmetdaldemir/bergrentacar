/**
 * Script to check if locations table exists and create it if needed
 * Run: npx ts-node src/scripts/check-locations-table.ts
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { MasterLocation } from '../modules/shared/entities/master-location.entity';

async function checkLocationsTable() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Check if locations table exists
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    const tableExists = await queryRunner.hasTable('locations');
    
    if (tableExists) {
      console.log('✅ locations table exists');
      
      // Count records
      const count = await queryRunner.query('SELECT COUNT(*) as count FROM locations');
      console.log(`📊 Total records in locations table: ${count[0].count}`);
      
      // Show table structure
      const columns = await queryRunner.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'locations'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Table structure:');
      console.table(columns);
    } else {
      console.log('❌ locations table does NOT exist');
      console.log('\n🔧 Solution:');
      console.log('1. Set DB_SYNC=true in backend/.env file');
      console.log('2. Restart backend container:');
      console.log('   cd infra && docker-compose restart backend');
      console.log('\nOr manually create the table using SQL:');
      
      // Generate SQL for creating the table
      console.log(`
CREATE TYPE "MasterLocationType" AS ENUM ('merkez', 'otel', 'havalimani', 'adres');

CREATE TABLE "locations" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    "name" character varying(200) NOT NULL,
    "parent_id" uuid,
    "type" "MasterLocationType" NOT NULL DEFAULT 'merkez',
    CONSTRAINT "PK_locations" PRIMARY KEY ("id"),
    CONSTRAINT "FK_locations_parent" FOREIGN KEY ("parent_id") 
        REFERENCES "locations"("id") 
        ON DELETE NO ACTION 
        ON UPDATE NO ACTION
);

CREATE INDEX "IDX_locations_parent_id" ON "locations"("parent_id");
CREATE INDEX "IDX_locations_type" ON "locations"("type");
      `);
    }

    // Check if MasterLocation is in entities array
    const entities = AppDataSource.options.entities as any[];
    const hasMasterLocation = entities.some(
      (entity) => entity === MasterLocation || entity.name === 'MasterLocation'
    );
    
    if (hasMasterLocation) {
      console.log('\n✅ MasterLocation entity is registered in AppDataSource');
    } else {
      console.log('\n❌ MasterLocation entity is NOT registered in AppDataSource');
      console.log('🔧 Fix: Add MasterLocation to entities array in data-source.ts');
    }

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('\n✅ Done');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\n📋 Full error:', error);
    
    if (error.message?.includes('does not exist')) {
      console.log('\n💡 This might be a connection issue. Check:');
      console.log('1. DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME in .env');
      console.log('2. Database connection settings');
      console.log('3. PostgreSQL is running and accessible');
    }
    
    try {
      await AppDataSource.destroy();
    } catch {}
    process.exit(1);
  }
}

checkLocationsTable();


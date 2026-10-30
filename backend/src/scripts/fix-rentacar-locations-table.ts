/**
 * Fix rentacar_locations table structure for production
 * Adds location_id column if it doesn't exist
 * Migrates from master_location_id if exists
 * Run: npm run fix:rentacar-locations
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';

async function fixRentacarLocationsTable() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // Check if location_id column exists
    const columns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rentacar_locations' 
      AND column_name IN ('location_id', 'master_location_id')
    `);

    const columnNames = columns.map((col: any) => col.column_name);
    const hasLocationId = columnNames.includes('location_id');
    const hasMasterLocationId = columnNames.includes('master_location_id');

    console.log('\n📋 Current columns:', columnNames);

    if (hasLocationId) {
      console.log('✅ location_id column already exists');
      
      // Check if it has foreign key constraint
      const foreignKeys = await queryRunner.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'rentacar_locations'
          AND kcu.column_name = 'location_id'
      `);

      if (foreignKeys.length === 0) {
        console.log('⚠️  location_id foreign key constraint missing, adding...');
        
        // Add foreign key constraint
        await queryRunner.query(`
          ALTER TABLE rentacar_locations
          ADD CONSTRAINT FK_rentacar_locations_location_id
          FOREIGN KEY (location_id)
          REFERENCES locations(id)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
        `);
        console.log('✅ Foreign key constraint added');
      } else {
        console.log('✅ Foreign key constraint exists');
      }
    } else {
      console.log('❌ location_id column does NOT exist');
      
      // Step 1: Add location_id column (nullable first)
      console.log('\n📝 Step 1: Adding location_id column...');
      await queryRunner.query(`
        ALTER TABLE rentacar_locations
        ADD COLUMN IF NOT EXISTS location_id uuid
      `);
      console.log('✅ location_id column added (nullable)');

      // Step 2: If master_location_id exists, migrate data
      if (hasMasterLocationId) {
        console.log('\n📝 Step 2: Migrating data from master_location_id...');
        
        const migrationResult = await queryRunner.query(`
          UPDATE rentacar_locations
          SET location_id = master_location_id
          WHERE master_location_id IS NOT NULL
            AND location_id IS NULL
        `);
        
        console.log(`✅ Migrated ${migrationResult[1] || 0} records`);
      } else {
        console.log('\n📝 Step 2: No master_location_id column found, skipping migration');
      }

      // Step 3: Add foreign key constraint
      console.log('\n📝 Step 3: Adding foreign key constraint...');
      try {
        await queryRunner.query(`
          ALTER TABLE rentacar_locations
          ADD CONSTRAINT FK_rentacar_locations_location_id
          FOREIGN KEY (location_id)
          REFERENCES locations(id)
          ON DELETE NO ACTION
          ON UPDATE NO ACTION
        `);
        console.log('✅ Foreign key constraint added');
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log('✅ Foreign key constraint already exists');
        } else {
          throw error;
        }
      }

      // Step 4: Add index
      console.log('\n📝 Step 4: Adding index...');
      try {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS IDX_rentacar_locations_location_id
          ON rentacar_locations(location_id)
        `);
        console.log('✅ Index added');
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log('✅ Index already exists');
        } else {
          throw error;
        }
      }

      // Step 5: Add unique constraint
      console.log('\n📝 Step 5: Adding unique constraint...');
      try {
        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS UQ_rentacar_locations_tenant_location
          ON rentacar_locations(tenant_id, location_id)
          WHERE location_id IS NOT NULL
        `);
        console.log('✅ Unique constraint added');
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log('✅ Unique constraint already exists');
        } else {
          console.log('⚠️  Could not add unique constraint (may already exist)');
        }
      }

      // Step 6: Check for NULL values
      console.log('\n📝 Step 6: Checking for NULL location_id values...');
      const nullCount = await queryRunner.query(`
        SELECT COUNT(*) as count
        FROM rentacar_locations
        WHERE location_id IS NULL
      `);
      
      const nullCountValue = parseInt(nullCount[0].count);
      if (nullCountValue > 0) {
        console.log(`⚠️  Found ${nullCountValue} records with NULL location_id`);
        console.log('   These records need to be manually updated or deleted');
      } else {
        console.log('✅ No NULL location_id values found');
        
        // Step 7: Make location_id NOT NULL (only if no NULLs)
        console.log('\n📝 Step 7: Making location_id NOT NULL...');
        try {
          await queryRunner.query(`
            ALTER TABLE rentacar_locations
            ALTER COLUMN location_id SET NOT NULL
          `);
          console.log('✅ location_id set to NOT NULL');
        } catch (error: any) {
          console.log('⚠️  Could not set NOT NULL (may have NULL values):', error.message);
        }
      }
    }

    // Show final table structure
    console.log('\n' + '='.repeat(60));
    console.log('📊 Final rentacar_locations table structure:');
    const finalColumns = await queryRunner.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'rentacar_locations'
      ORDER BY ordinal_position
    `);
    console.table(finalColumns);

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('\n✅ Fix completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n📋 Full error:', error);
    try {
      await AppDataSource.destroy();
    } catch {}
    process.exit(1);
  }
}

fixRentacarLocationsTable();


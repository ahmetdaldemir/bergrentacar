/**
 * Remove old columns from rentacar_locations table
 * Removes: name, parent_id, type (these are now in locations master table)
 * Run: npm run fix:remove-old-location-columns
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';

async function removeOldLocationColumns() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    // Check current columns
    const columns = await queryRunner.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'rentacar_locations'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Current rentacar_locations columns:');
    console.table(columns);

    const columnNames = columns.map((col: any) => col.column_name);
    const columnsToRemove = ['name', 'parent_id', 'type', 'master_location_id'];

    console.log('\n🔍 Checking for old columns to remove...');

    for (const columnName of columnsToRemove) {
      if (columnNames.includes(columnName)) {
        console.log(`\n📝 Removing column: ${columnName}`);

        try {
          // First, drop any constraints that might reference this column
          const constraints = await queryRunner.query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'rentacar_locations'
              AND constraint_name LIKE '%${columnName}%'
          `);

          for (const constraint of constraints) {
            try {
              if (constraint.constraint_type === 'FOREIGN KEY') {
                await queryRunner.query(`
                  ALTER TABLE rentacar_locations
                  DROP CONSTRAINT IF EXISTS ${constraint.constraint_name} CASCADE
                `);
                console.log(`  ✅ Dropped foreign key: ${constraint.constraint_name}`);
              } else if (constraint.constraint_type === 'UNIQUE') {
                await queryRunner.query(`
                  ALTER TABLE rentacar_locations
                  DROP CONSTRAINT IF EXISTS ${constraint.constraint_name} CASCADE
                `);
                console.log(`  ✅ Dropped unique constraint: ${constraint.constraint_name}`);
              }
            } catch (error: any) {
              console.log(`  ⚠️  Could not drop constraint ${constraint.constraint_name}:`, error.message);
            }
          }

          // Drop indexes on this column
          const indexes = await queryRunner.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'rentacar_locations'
              AND indexdef LIKE '%${columnName}%'
          `);

          for (const index of indexes) {
            try {
              await queryRunner.query(`DROP INDEX IF EXISTS ${index.indexname} CASCADE`);
              console.log(`  ✅ Dropped index: ${index.indexname}`);
            } catch (error: any) {
              console.log(`  ⚠️  Could not drop index ${index.indexname}:`, error.message);
            }
          }

          // Drop the column
          await queryRunner.query(`
            ALTER TABLE rentacar_locations
            DROP COLUMN IF EXISTS ${columnName} CASCADE
          `);
          console.log(`  ✅ Column ${columnName} removed`);
        } catch (error: any) {
          console.error(`  ❌ Error removing column ${columnName}:`, error.message);
        }
      } else {
        console.log(`  ✅ Column ${columnName} does not exist (already removed)`);
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

    // Verify required columns exist
    const requiredColumns = ['id', 'created_at', 'updated_at', 'tenant_id', 'location_id', 'meta_title', 'sort', 'delivery_fee', 'drop_fee', 'is_active'];
    const finalColumnNames = finalColumns.map((col: any) => col.column_name);
    const missingColumns = requiredColumns.filter(col => !finalColumnNames.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing required columns:', missingColumns);
      console.log('   These should be created by synchronize or manually');
    } else {
      console.log('\n✅ All required columns are present');
    }

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('\n✅ Old columns removal completed!');
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

removeOldLocationColumns();


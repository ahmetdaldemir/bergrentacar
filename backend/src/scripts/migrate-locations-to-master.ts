import 'reflect-metadata';
import { IsNull, DataSource } from 'typeorm';
import { MasterLocation, MasterLocationType } from '../modules/shared/entities/master-location.entity';
import { loadEnv } from '../config/env';

/**
 * Mevcut rentacar_locations tablosundaki verileri master locations yapısına migrate eder
 * Bu script:
 * 1. Mevcut her location için master location oluşturur
 * 2. rentacar_locations tablosundaki kayıtları master location'lara map eder
 * 3. name ve parentId kolonlarını kaldırır (manuel olarak kaldırılacak veya migration ile)
 */

async function migrateLocationsToMaster() {
  const env = loadEnv();
  
  // Create a new DataSource with synchronize disabled for migration
  const migrationDataSource = new DataSource({
    type: 'postgres',
    host: env.database.host,
    port: env.database.port,
    username: env.database.username,
    password: env.database.password,
    database: env.database.name,
    synchronize: false, // Disable synchronize for migration
    logging: false,
    entities: [MasterLocation],
  });

  try {
    await migrationDataSource.initialize();
    console.log('✅ Database connected');

    const masterLocationRepo = migrationDataSource.getRepository(MasterLocation);

    // Get all existing locations using raw SQL (because entity structure has changed)
    const existingLocationsResult = await migrationDataSource.query(`
      SELECT id, tenant_id, name, meta_title, parent_id, type, sort, delivery_fee, drop_fee, min_day_count, is_active, created_at, updated_at
      FROM rentacar_locations
      ORDER BY created_at ASC
    `);

    console.log(`📋 Found ${existingLocationsResult.length} existing locations to migrate\n`);

    if (existingLocationsResult.length === 0) {
      console.log('✅ No locations to migrate');
      await migrationDataSource.destroy();
      return;
    }

    // First, create master locations for top-level locations (parent_id is null)
    console.log('📍 Step 1: Creating master locations for top-level locations...\n');
    const masterLocationMap = new Map<string, string>(); // old location id -> master location id

    // Get all top-level locations first
    const topLevelLocations = existingLocationsResult.filter((loc: any) => !loc.parent_id);
    console.log(`   Found ${topLevelLocations.length} top-level locations`);

    for (const location of topLevelLocations) {
      try {
        // Check if master location already exists with same name
        const existingMaster = await masterLocationRepo.findOne({
          where: { name: location.name, parentId: IsNull() },
        });

        if (existingMaster) {
          console.log(`   ⏭️  Master location already exists: ${location.name}`);
          masterLocationMap.set(location.id, existingMaster.id);
          continue;
        }

        // Create master location
        const masterLocation = masterLocationRepo.create({
          name: location.name,
          type: location.type || MasterLocationType.MERKEZ,
          parentId: null,
        });

        const savedMaster = await masterLocationRepo.save(masterLocation);
        masterLocationMap.set(location.id, savedMaster.id);
        console.log(`   ✅ Created master location: ${location.name} (ID: ${savedMaster.id})`);
      } catch (error: any) {
        console.error(`   ❌ Error creating master location for ${location.name}:`, error.message);
      }
    }

    // Then, create master locations for child locations
    console.log('\n📍 Step 2: Creating master locations for child locations...\n');
    const childLocations = existingLocationsResult.filter((loc: any) => loc.parent_id);
    console.log(`   Found ${childLocations.length} child locations`);

    // Sort child locations by depth (children of top-level first)
    let processed = 0;
    while (processed < childLocations.length) {
      const remaining = childLocations.filter((loc: any) => !masterLocationMap.has(loc.id));
      
      for (const location of remaining) {
        const parentMasterId = masterLocationMap.get(location.parent_id);
        
        if (!parentMasterId) {
          // Parent not yet processed, skip for now
          continue;
        }

        try {
          // Check if master location already exists
          const existingMaster = await masterLocationRepo.findOne({
            where: { name: location.name, parentId: parentMasterId },
          });

          if (existingMaster) {
            console.log(`   ⏭️  Master location already exists: ${location.name}`);
            masterLocationMap.set(location.id, existingMaster.id);
            processed++;
            continue;
          }

          // Create master location
          const masterLocation = masterLocationRepo.create({
            name: location.name,
            type: location.type || MasterLocationType.MERKEZ,
            parentId: parentMasterId,
          });

          const savedMaster = await masterLocationRepo.save(masterLocation);
          masterLocationMap.set(location.id, savedMaster.id);
          console.log(`   ✅ Created master location: ${location.name} (ID: ${savedMaster.id})`);
          processed++;
        } catch (error: any) {
          console.error(`   ❌ Error creating master location for ${location.name}:`, error.message);
          processed++;
        }
      }

      if (remaining.length === 0) break;
    }

    // Step 3: Add master_location_id column if it doesn't exist
    console.log('\n📍 Step 3: Adding master_location_id column...\n');
    try {
      const columnCheck = await migrationDataSource.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='rentacar_locations' AND column_name='master_location_id'
      `);

      if (columnCheck.length === 0) {
        console.log(`   Adding master_location_id column as nullable...`);
        await migrationDataSource.query(`
          ALTER TABLE rentacar_locations 
          ADD COLUMN master_location_id UUID REFERENCES locations(id)
        `);
        console.log(`   ✅ Column master_location_id added`);
      } else {
        console.log(`   ✅ Column master_location_id already exists`);
      }
      } catch (error: any) {
        console.error(`   ❌ Error adding column:`, error.message);
        await migrationDataSource.destroy();
        process.exit(1);
      }

    // Step 4: Update rentacar_locations to set master_location_id
    console.log('\n📍 Step 4: Updating rentacar_locations with master_location_id...\n');
    let updated = 0;
    let failed = 0;

    for (const location of existingLocationsResult) {
      const masterLocationId = masterLocationMap.get(location.id);
      
      if (!masterLocationId) {
        console.error(`   ❌ No master location found for location ${location.id}`);
        failed++;
        continue;
      }

      try {
        // Update master_location_id
        await migrationDataSource.query(
          `UPDATE rentacar_locations SET master_location_id = $1 WHERE id = $2`,
          [masterLocationId, location.id]
        );
        updated++;
        console.log(`   ✅ Updated location ${location.id} -> master_location_id: ${masterLocationId}`);
      } catch (error: any) {
        console.error(`   ❌ Error updating location ${location.id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total master locations created: ${masterLocationMap.size}`);

    await migrationDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    try {
      if (migrationDataSource.isInitialized) {
        await migrationDataSource.destroy();
      }
    } catch (destroyError) {
      // Ignore destroy errors
    }
    process.exit(1);
  }
}

migrateLocationsToMaster();


import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { MasterLocationType } from '../modules/shared/entities/master-location.entity';
import { MasterLocationService } from '../modules/shared/services/master-location.service';

/**
 * Türkiye'deki tüm illerin alt bölgelerini ekler (sadece master locations tablosuna)
 * Her il için: "{İl Adı} Otel", "{İl Adı} Havalimanı", "{İl Adı} Merkez"
 * Sadece locations (master) tablosuna eklenir, tenant mapping yapılmaz
 * Kullanım: npm run seed:province-sub-locations
 */

async function seedTurkeyProvinceSubLocations() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Get all top-level master locations (provinces)
    const allMasterLocations = await MasterLocationService.list(null);
    const provinces = allMasterLocations.filter((loc) => !loc.parentId);

    if (provinces.length === 0) {
      console.log(`  ⚠️  No provinces found. Please run seed:provinces first.`);
      await AppDataSource.destroy();
      return;
    }

    console.log(`  📍 Found ${provinces.length} provinces\n`);

    let subLocationsCreated = 0;
    let subLocationsSkipped = 0;

    for (const province of provinces) {
      const subLocationTypes = [
        { name: `${province.name} Otel`, type: MasterLocationType.OTEL },
        { name: `${province.name} Havalimanı`, type: MasterLocationType.HAVALIMANI },
        { name: `${province.name} Merkez`, type: MasterLocationType.MERKEZ },
      ];

      for (const subLocation of subLocationTypes) {
        try {
          // Check if master sub-location already exists
          const existingMasterLocations = await MasterLocationService.list(province.id);
          const existingSubLocation = existingMasterLocations.find(ml => ml.name === subLocation.name);
          
          if (existingSubLocation) {
            subLocationsSkipped++;
            console.log(`    ⏭️  ${subLocation.name} already exists`);
            continue;
          }

          // Create master sub-location (sadece locations tablosuna)
          await MasterLocationService.create({
            name: subLocation.name,
            parentId: province.id,
            type: subLocation.type,
          });

          subLocationsCreated++;
          console.log(`    ✅ Created master sub-location: ${subLocation.name} (${subLocation.type})`);
        } catch (error: any) {
          console.error(`    ❌ Error creating ${subLocation.name}:`, error.message);
          // Continue with next sub-location even if one fails
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Overall Summary:');
    console.log(`   Total sub-locations created: ${subLocationsCreated}`);
    console.log(`   Total sub-locations skipped: ${subLocationsSkipped}`);
    console.log(`   Expected: ~${81 * 3} sub-locations (81 provinces × 3 types)`);
    console.log('='.repeat(60));
    console.log('\n✅ Turkey province sub-locations seeding completed!');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Failed to seed Turkey province sub-locations:', error);
    process.exit(1);
  }
}

seedTurkeyProvinceSubLocations();


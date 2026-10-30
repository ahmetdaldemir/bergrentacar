import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { LocationService } from '../modules/rentacar/services/location.service';
import { MasterLocationService } from '../modules/shared/services/master-location.service';
import { MasterLocationType } from '../modules/shared/entities/master-location.entity';

/**
 * Türkiye'deki tüm illeri (81 il) üst lokasyon olarak ekler
 * Tüm tenant'lar için eklenir
 * Kullanım: npm run seed:provinces
 */

// Türkiye'nin 81 ili (plaka koduna göre sıralı)
const TURKEY_PROVINCES = [
  { name: 'Adana', code: 1 },
  { name: 'Adıyaman', code: 2 },
  { name: 'Afyonkarahisar', code: 3 },
  { name: 'Ağrı', code: 4 },
  { name: 'Amasya', code: 5 },
  { name: 'Ankara', code: 6 },
  { name: 'Antalya', code: 7 },
  { name: 'Artvin', code: 8 },
  { name: 'Aydın', code: 9 },
  { name: 'Balıkesir', code: 10 },
  { name: 'Bilecik', code: 11 },
  { name: 'Bingöl', code: 12 },
  { name: 'Bitlis', code: 13 },
  { name: 'Bolu', code: 14 },
  { name: 'Burdur', code: 15 },
  { name: 'Bursa', code: 16 },
  { name: 'Çanakkale', code: 17 },
  { name: 'Çankırı', code: 18 },
  { name: 'Çorum', code: 19 },
  { name: 'Denizli', code: 20 },
  { name: 'Diyarbakır', code: 21 },
  { name: 'Edirne', code: 22 },
  { name: 'Elazığ', code: 23 },
  { name: 'Erzincan', code: 24 },
  { name: 'Erzurum', code: 25 },
  { name: 'Eskişehir', code: 26 },
  { name: 'Gaziantep', code: 27 },
  { name: 'Giresun', code: 28 },
  { name: 'Gümüşhane', code: 29 },
  { name: 'Hakkari', code: 30 },
  { name: 'Hatay', code: 31 },
  { name: 'Isparta', code: 32 },
  { name: 'İçel (Mersin)', code: 33 },
  { name: 'İstanbul', code: 34 },
  { name: 'İzmir', code: 35 },
  { name: 'Kars', code: 36 },
  { name: 'Kastamonu', code: 37 },
  { name: 'Kayseri', code: 38 },
  { name: 'Kırklareli', code: 39 },
  { name: 'Kırşehir', code: 40 },
  { name: 'Kocaeli', code: 41 },
  { name: 'Konya', code: 42 },
  { name: 'Kütahya', code: 43 },
  { name: 'Malatya', code: 44 },
  { name: 'Manisa', code: 45 },
  { name: 'Kahramanmaraş', code: 46 },
  { name: 'Mardin', code: 47 },
  { name: 'Muğla', code: 48 },
  { name: 'Muş', code: 49 },
  { name: 'Nevşehir', code: 50 },
  { name: 'Niğde', code: 51 },
  { name: 'Ordu', code: 52 },
  { name: 'Rize', code: 53 },
  { name: 'Sakarya', code: 54 },
  { name: 'Samsun', code: 55 },
  { name: 'Siirt', code: 56 },
  { name: 'Sinop', code: 57 },
  { name: 'Sivas', code: 58 },
  { name: 'Tekirdağ', code: 59 },
  { name: 'Tokat', code: 60 },
  { name: 'Trabzon', code: 61 },
  { name: 'Tunceli', code: 62 },
  { name: 'Şanlıurfa', code: 63 },
  { name: 'Uşak', code: 64 },
  { name: 'Van', code: 65 },
  { name: 'Yozgat', code: 66 },
  { name: 'Zonguldak', code: 67 },
  { name: 'Aksaray', code: 68 },
  { name: 'Bayburt', code: 69 },
  { name: 'Karaman', code: 70 },
  { name: 'Kırıkkale', code: 71 },
  { name: 'Batman', code: 72 },
  { name: 'Şırnak', code: 73 },
  { name: 'Bartın', code: 74 },
  { name: 'Ardahan', code: 75 },
  { name: 'Iğdır', code: 76 },
  { name: 'Yalova', code: 77 },
  { name: 'Karabük', code: 78 },
  { name: 'Kilis', code: 79 },
  { name: 'Osmaniye', code: 80 },
  { name: 'Düzce', code: 81 },
];

async function seedTurkeyProvinces() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenants = await tenantRepo.find({ order: { createdAt: 'ASC' }, take: 1 });
    const tenant = tenants[0];

    if (!tenant) {
      console.log('⚠️  No tenants found. Please create at least one tenant first.');
      await AppDataSource.destroy();
      return;
    }

    console.log(`📋 Using tenant: ${tenant.name} (${tenant.id})\n`);

    let totalLocationsCreated = 0;
    let totalLocationsSkipped = 0;

      for (const province of TURKEY_PROVINCES) {
        try {
          // First, create or get master location
          const existingMasterLocations = await MasterLocationService.list(null);
          let masterLocation = existingMasterLocations.find(ml => ml.name === province.name && !ml.parentId);
          
          if (!masterLocation) {
            // Create master location
            masterLocation = await MasterLocationService.create({
              name: province.name,
              parentId: null,
              type: MasterLocationType.MERKEZ,
            });
            console.log(`  📍 Master location created: ${province.name}`);
          }

          // Check if tenant location already exists
          const existingLocations = await LocationService.list(tenant.id);
          const exists = existingLocations.some(
            (loc) => loc.locationId === masterLocation.id
          );

          if (exists) {
            totalLocationsSkipped++;
            console.log(`  ⏭️  ${province.name} already mapped for tenant`);
            continue;
          }

          // Create tenant location mapping
          await LocationService.create({
            tenantId: tenant.id,
            locationId: masterLocation.id,
            metaTitle: `${province.name} Araç Kiralama`,
            sort: province.code,
            deliveryFee: 0,
            dropFee: 0,
            isActive: true,
          });

          totalLocationsCreated++;
          console.log(`  ✅ Created tenant location: ${province.name} (Plaka: ${province.code})`);
        } catch (error: any) {
          console.error(`  ❌ Error creating ${province.name}:`, error.message);
          // Continue with next province even if one fails
        }
      }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Overall Summary:');
    console.log(`   Tenant: ${tenant.name}`);
    console.log(`   Total locations created: ${totalLocationsCreated}`);
    console.log(`   Total locations skipped: ${totalLocationsSkipped}`);
    console.log(`   Total provinces: ${TURKEY_PROVINCES.length}`);
    console.log('='.repeat(60));
    console.log('\n✅ Turkey provinces seeding completed!');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Failed to seed Turkey provinces:', error);
    process.exit(1);
  }
}

seedTurkeyProvinces();


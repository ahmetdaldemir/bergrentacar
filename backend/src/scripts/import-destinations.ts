import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { DestinationImportService } from '../modules/shared/services/destination-import.service';
import { TenantService } from '../modules/tenants/services/tenant.service';
import { loadEnv } from '../config/env';

const env = loadEnv();

const defaultCities: Array<{ city: string; radius?: number; limit?: number }> = [
  { city: 'Istanbul', radius: 25, limit: 40 },
  { city: 'Ankara', radius: 20, limit: 25 },
  { city: 'Antalya', radius: 25, limit: 40 },
  { city: 'Alanya', radius: 15, limit: 25 },
  { city: 'Side', radius: 15, limit: 20 },
  { city: 'Kemer', radius: 15, limit: 20 },
  { city: 'Belek', radius: 10, limit: 15 },
  { city: 'Kas', radius: 15, limit: 20 },
  { city: 'Fethiye', radius: 20, limit: 25 },
  { city: 'Oludeniz', radius: 10, limit: 15 },
  { city: 'Marmaris', radius: 20, limit: 25 },
  { city: 'Bodrum', radius: 20, limit: 25 },
  { city: 'Cesme', radius: 15, limit: 20 },
  { city: 'Kusadasi', radius: 15, limit: 20 },
  { city: 'Pamukkale', radius: 15, limit: 15 },
  { city: 'Goreme', radius: 20, limit: 25 },
  { city: 'Nevsehir', radius: 20, limit: 20 },
  { city: 'Trabzon', radius: 20, limit: 20 },
  { city: 'Rize', radius: 20, limit: 20 },
  { city: 'Gaziantep', radius: 20, limit: 15 },
  { city: 'Sanliurfa', radius: 20, limit: 20 },
  { city: 'Mardin', radius: 20, limit: 20 },
  { city: 'Bursa', radius: 20, limit: 15 },
  { city: 'Izmir', radius: 20, limit: 30 },
  { city: 'Kagizcak', radius: 10, limit: 10 },
];

async function run() {
  if (!env.integrations.rapidApiKey) {
    console.error('RAPIDAPI_KEY is not set in environment');
    process.exit(1);
  }

  await AppDataSource.initialize();

  // Get first tenant or create a default one
  const tenants = await TenantService.listTenants();
  if (tenants.length === 0) {
    console.error('No tenants found. Please create a tenant first.');
    process.exit(1);
  }
  const tenant = tenants[0];

  const results: Array<{ city: string; imported: number; skipped: number }> = [];

  try {
    for (const cityConfig of defaultCities) {
      console.log(`Importing destinations for ${cityConfig.city}...`);
      try {
        const result = await DestinationImportService.importGlobal({
          tenantId: tenant.id,
          city: cityConfig.city,
          radius: cityConfig.radius,
          limit: cityConfig.limit,
        });
        results.push({
          city: cityConfig.city,
          imported: result.imported.length,
          skipped: result.skipped.length,
        });
        console.log(`  Imported: ${result.imported.length}, Skipped: ${result.skipped.length}`);
      } catch (error) {
        console.error(`  Failed for ${cityConfig.city}: ${(error as Error).message}`);
      }
    }
  } finally {
    await AppDataSource.destroy();
  }

  console.log('\nSummary');
  for (const summary of results) {
    console.log(`- ${summary.city}: imported ${summary.imported}, skipped ${summary.skipped}`);
  }
}

run().catch((error) => {
  console.error('Import process failed', error);
  process.exit(1);
});

import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { HotelImportService } from '../modules/shared/services/hotel-import.service';
import { TenantService } from '../modules/tenants/services/tenant.service';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for argument ${arg}`);
      }
      options[key] = value;
      i += 1;
    }
  }

  return options;
};

async function run() {
  const options = parseArgs();
  const city = options.city;
  const country = options.country;
  const radius = options.radius ? Number(options.radius) : undefined;
  const limit = options.limit ? Number(options.limit) : undefined;

  if (!city) {
    throw new Error('Usage: npm run import:hotels -- --city <city> [--country <country>] [--radius <km>] [--limit <n>]');
  }

  await AppDataSource.initialize();

  // Get first tenant or create a default one
  const tenants = await TenantService.listTenants();
  if (tenants.length === 0) {
    throw new Error('No tenants found. Please create a tenant first.');
  }
  const tenant = tenants[0];

  try {
    console.log(`Importing hotels for ${city}...`);
    const result = await HotelImportService.importByCity({
      tenantId: tenant.id,
      city,
      country,
      radius,
      limit,
    });

    console.log(`Created ${result.created.length} hotels, skipped ${result.skipped.length}.`);
    if (result.created.length) {
      console.log('Created:', result.created.join(', '));
    }
    if (result.skipped.length) {
      console.log('Skipped:', result.skipped.join(', '));
    }
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((error) => {
  console.error('Hotel import failed:', error);
  process.exit(1);
});


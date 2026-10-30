import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { Destination } from '../modules/shared/entities/destination.entity';

const TENANT_ID = '30119880-b233-4896-b612-1463e32617f2';

async function updateDestinationsTenant() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const destinationRepo = AppDataSource.getRepository(Destination);

    // Get all destinations without tenant_id or with null tenant_id
    const destinations = await destinationRepo.find({
      where: [
        { tenantId: null as any },
        // Also check if tenantId column doesn't exist yet (will be handled by synchronize)
      ],
    });

    // Also try to get all destinations (in case column doesn't exist yet)
    const allDestinations = await destinationRepo
      .createQueryBuilder('destination')
      .where('destination.tenant_id IS NULL OR destination.tenant_id IS NOT NULL')
      .getMany();

    const destinationsToUpdate = allDestinations.length > 0 ? allDestinations : destinations;

    if (destinationsToUpdate.length === 0) {
      console.log('✅ No destinations to update');
      await AppDataSource.destroy();
      process.exit(0);
    }

    console.log(`📝 Found ${destinationsToUpdate.length} destination(s) to update`);

    // First, try to update via raw SQL (in case column exists but is nullable)
    try {
      await destinationRepo.query(`
        UPDATE destinations 
        SET tenant_id = $1 
        WHERE tenant_id IS NULL
      `, [TENANT_ID]);
      console.log(`✅ Updated destinations via SQL`);
    } catch (error: any) {
      // If column doesn't exist yet, synchronize will add it
      console.log('⚠️  Column might not exist yet, will be handled by synchronize');
    }

    // Then update via repository
    for (const destination of destinationsToUpdate) {
      if (!destination.tenantId) {
        destination.tenantId = TENANT_ID;
        await destinationRepo.save(destination);
        console.log(`✅ Updated destination ${destination.id}`);
      }
    }

    console.log('✅ All destinations updated successfully');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

updateDestinationsTenant();


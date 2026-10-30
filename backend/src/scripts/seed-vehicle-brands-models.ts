import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { VehicleBrand } from '../modules/rentacar/entities/vehicle-brand.entity';
import { VehicleModel } from '../modules/rentacar/entities/vehicle-model.entity';

/**
 * Popüler araç marka ve modellerini veritabanına ekler
 * Kullanım: npm run seed:vehicles
 */

// Türkiye'de popüler araç markaları ve modelleri
const VEHICLE_BRANDS_AND_MODELS: Array<{
  brand: string;
  models: string[];
}> = [
  {
    brand: 'Toyota',
    models: [
      'Corolla',
      'Yaris',
      'Camry',
      'C-HR',
      'RAV4',
      'Highlander',
      'Land Cruiser',
      'Hilux',
      'Auris',
      'Prius',
      'Aygo',
      'Corolla Cross',
    ],
  },
  {
    brand: 'Volkswagen',
    models: [
      'Golf',
      'Polo',
      'Passat',
      'Jetta',
      'Tiguan',
      'Touareg',
      'T-Cross',
      'T-Roc',
      'Arteon',
      'Up!',
      'Touran',
      'Sharan',
    ],
  },
  {
    brand: 'Renault',
    models: [
      'Clio',
      'Megane',
      'Fluence',
      'Captur',
      'Kadjar',
      'Koleos',
      'Talisman',
      'Espace',
      'Scenic',
      'Twingo',
      'Duster',
      'Symbol',
    ],
  },
  {
    brand: 'Ford',
    models: [
      'Fiesta',
      'Focus',
      'Mondeo',
      'Kuga',
      'Edge',
      'Explorer',
      'Mustang',
      'Ranger',
      'Tourneo',
      'EcoSport',
      'Puma',
      'Territory',
    ],
  },
  {
    brand: 'Fiat',
    models: [
      'Egea',
      'Linea',
      'Tipo',
      '500',
      '500X',
      '500L',
      'Doblo',
      'Fiorino',
      'Panda',
      'Punto',
      'Bravo',
      'Freemont',
    ],
  },
  {
    brand: 'Opel',
    models: [
      'Corsa',
      'Astra',
      'Insignia',
      'Crossland',
      'Grandland',
      'Mokka',
      'Combo',
      'Movano',
      'Vivaro',
      'Adam',
      'Karl',
    ],
  },
  {
    brand: 'Hyundai',
    models: [
      'i10',
      'i20',
      'i30',
      'Elantra',
      'Sonata',
      'Tucson',
      'Santa Fe',
      'Kona',
      'Venue',
      'Palisade',
      'Ioniq',
      'Nexo',
    ],
  },
  {
    brand: 'Kia',
    models: [
      'Picanto',
      'Rio',
      'Ceed',
      'Optima',
      'Sportage',
      'Sorento',
      'Stonic',
      'Seltos',
      'Niro',
      'Soul',
      'Carnival',
      'Stinger',
    ],
  },
  {
    brand: 'Peugeot',
    models: [
      '208',
      '301',
      '308',
      '508',
      '2008',
      '3008',
      '5008',
      'Partner',
      'Expert',
      'Boxer',
      'Traveller',
      'Rifter',
    ],
  },
  {
    brand: 'Citroen',
    models: [
      'C3',
      'C3 Aircross',
      'C4',
      'C4 Cactus',
      'C5 Aircross',
      'Berlingo',
      'Jumper',
      'SpaceTourer',
      'C-Elysee',
      'DS3',
      'DS4',
      'DS5',
    ],
  },
  {
    brand: 'BMW',
    models: [
      '1 Series',
      '2 Series',
      '3 Series',
      '4 Series',
      '5 Series',
      '6 Series',
      '7 Series',
      'X1',
      'X2',
      'X3',
      'X4',
      'X5',
      'X6',
      'X7',
      'Z4',
      'i3',
      'i4',
      'iX',
    ],
  },
  {
    brand: 'Mercedes-Benz',
    models: [
      'A-Class',
      'B-Class',
      'C-Class',
      'E-Class',
      'S-Class',
      'CLA',
      'CLS',
      'GLA',
      'GLB',
      'GLC',
      'GLE',
      'GLS',
      'G-Class',
      'V-Class',
      'Sprinter',
      'EQC',
      'EQS',
    ],
  },
  {
    brand: 'Audi',
    models: [
      'A1',
      'A3',
      'A4',
      'A5',
      'A6',
      'A7',
      'A8',
      'Q2',
      'Q3',
      'Q5',
      'Q7',
      'Q8',
      'TT',
      'R8',
      'e-tron',
      'e-tron GT',
    ],
  },
  {
    brand: 'Skoda',
    models: [
      'Fabia',
      'Rapid',
      'Octavia',
      'Superb',
      'Kamiq',
      'Karoq',
      'Kodiaq',
      'Scala',
      'Enyaq',
    ],
  },
  {
    brand: 'Seat',
    models: [
      'Ibiza',
      'Leon',
      'Ateca',
      'Tarraco',
      'Arona',
      'Formentor',
      'Alhambra',
    ],
  },
  {
    brand: 'Nissan',
    models: [
      'Micra',
      'Sentra',
      'Altima',
      'Juke',
      'Qashqai',
      'X-Trail',
      'Pathfinder',
      'Patrol',
      'Navara',
      'Leaf',
    ],
  },
  {
    brand: 'Mazda',
    models: [
      '2',
      '3',
      '6',
      'CX-3',
      'CX-30',
      'CX-5',
      'CX-8',
      'MX-5',
      'BT-50',
    ],
  },
  {
    brand: 'Honda',
    models: [
      'Civic',
      'Accord',
      'HR-V',
      'CR-V',
      'Pilot',
      'City',
      'Jazz',
      'Ridgeline',
      'Passport',
    ],
  },
  {
    brand: 'Suzuki',
    models: [
      'Swift',
      'SX4',
      'Vitara',
      'S-Cross',
      'Grand Vitara',
      'Jimny',
      'Baleno',
      'Ignis',
    ],
  },
  {
    brand: 'Dacia',
    models: [
      'Sandero',
      'Logan',
      'Duster',
      'Lodgy',
      'Dokker',
      'Spring',
    ],
  },
  {
    brand: 'Chevrolet',
    models: [
      'Spark',
      'Aveo',
      'Cruze',
      'Malibu',
      'Trax',
      'Equinox',
      'Traverse',
      'Tahoe',
      'Silverado',
    ],
  },
  {
    brand: 'Volvo',
    models: [
      'V40',
      'V60',
      'V90',
      'S60',
      'S90',
      'XC40',
      'XC60',
      'XC90',
    ],
  },
  {
    brand: 'Jeep',
    models: [
      'Renegade',
      'Compass',
      'Cherokee',
      'Grand Cherokee',
      'Wrangler',
      'Gladiator',
    ],
  },
  {
    brand: 'Mini',
    models: [
      'Cooper',
      'Countryman',
      'Clubman',
      'Paceman',
      'Convertible',
    ],
  },
  {
    brand: 'Land Rover',
    models: [
      'Discovery Sport',
      'Discovery',
      'Range Rover Evoque',
      'Range Rover Velar',
      'Range Rover Sport',
      'Range Rover',
      'Defender',
    ],
  },
  {
    brand: 'Jaguar',
    models: [
      'XE',
      'XF',
      'XJ',
      'E-Pace',
      'F-Pace',
      'I-Pace',
      'F-Type',
    ],
  },
  {
    brand: 'Porsche',
    models: [
      '911',
      'Cayenne',
      'Macan',
      'Panamera',
      'Boxster',
      'Cayman',
      'Taycan',
    ],
  },
  {
    brand: 'Tesla',
    models: [
      'Model 3',
      'Model S',
      'Model X',
      'Model Y',
    ],
  },
  {
    brand: 'MG',
    models: [
      'ZS',
      'HS',
      '5',
      'MG3',
    ],
  },
  {
    brand: 'Togg',
    models: [
      'T10X',
      'T10F',
      'T10S',
      'T10C',
    ],
  },
];

async function seedVehicleBrandsAndModels() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const brandRepo = AppDataSource.getRepository(VehicleBrand);
    const modelRepo = AppDataSource.getRepository(VehicleModel);

    let brandsCreated = 0;
    let brandsSkipped = 0;
    let modelsCreated = 0;
    let modelsSkipped = 0;

    for (const { brand: brandName, models } of VEHICLE_BRANDS_AND_MODELS) {
      // Check if brand exists
      let brand = await brandRepo.findOne({
        where: { name: brandName },
      });

      if (!brand) {
        // Create brand
        brand = brandRepo.create({
          name: brandName,
          isActive: true,
          sortOrder: brandsCreated,
        });
        brand = await brandRepo.save(brand);
        brandsCreated++;
        console.log(`✅ Created brand: ${brandName}`);
      } else {
        brandsSkipped++;
        console.log(`⏭️  Brand already exists: ${brandName}`);
      }

      // Process models for this brand
      for (const modelName of models) {
        // Check if model exists for this brand
        const existingModel = await modelRepo.findOne({
          where: {
            brandId: brand.id,
            name: modelName,
          },
        });

        if (!existingModel) {
          // Create model
          const model = modelRepo.create({
            brand,
            brandId: brand.id,
            name: modelName,
            isActive: true,
            sortOrder: modelsCreated % 100, // Simple sort order
          });
          await modelRepo.save(model);
          modelsCreated++;
          console.log(`  ✅ Created model: ${brandName} ${modelName}`);
        } else {
          modelsSkipped++;
          console.log(`  ⏭️  Model already exists: ${brandName} ${modelName}`);
        }
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   Brands: ${brandsCreated} created, ${brandsSkipped} skipped`);
    console.log(`   Models: ${modelsCreated} created, ${modelsSkipped} skipped`);
    console.log(`\n✅ Vehicle brands and models seeding completed!`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Failed to seed vehicle brands and models:', error);
    process.exit(1);
  }
}

seedVehicleBrandsAndModels();


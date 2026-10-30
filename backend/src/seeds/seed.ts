import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { Tenant, TenantCategory } from '../modules/tenants/entities/tenant.entity';
import { TenantUser, TenantUserRole } from '../modules/tenants/entities/tenant-user.entity';
import { Language } from '../modules/shared/entities/language.entity';
import { PhoneCountry } from '../modules/shared/entities/phone-country.entity';
import { Destination } from '../modules/shared/entities/destination.entity';
import { DestinationService } from '../modules/shared/services/destination.service';
import { Tour } from '../modules/tour/entities/tour.entity';
import { TourSession } from '../modules/tour/entities/tour-session.entity';
import { PaymentMethod, PaymentProvider } from '../modules/shared/entities/payment-method.entity';
import { Vehicle, FuelType, TransmissionType } from '../modules/rentacar/entities/vehicle.entity';
import { VehiclePlate } from '../modules/rentacar/entities/vehicle-plate.entity';
import { VehiclePricingPeriod, SeasonName } from '../modules/rentacar/entities/vehicle-pricing-period.entity';
import { Currency, CurrencyCode } from '../modules/shared/entities/currency.entity';

const seed = async () => {
  await AppDataSource.initialize();

  const languageRepo = AppDataSource.getRepository(Language);
  const phoneCountryRepo = AppDataSource.getRepository(PhoneCountry);
  const tenantRepo = AppDataSource.getRepository(Tenant);
  const userRepo = AppDataSource.getRepository(TenantUser);
  const destinationRepo = AppDataSource.getRepository(Destination);
  const tourRepo = AppDataSource.getRepository(Tour);
  const tourSessionRepo = AppDataSource.getRepository(TourSession);
  const paymentMethodRepo = AppDataSource.getRepository(PaymentMethod);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const plateRepo = AppDataSource.getRepository(VehiclePlate);
  const pricingRepo = AppDataSource.getRepository(VehiclePricingPeriod);
  const currencyRepo = AppDataSource.getRepository(Currency);

  // Languages
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'de', name: 'Deutsch' },
  ];

  for (const lang of languages) {
    let language = await languageRepo.findOne({ where: { code: lang.code } });
    if (!language) {
      language = languageRepo.create({ ...lang });
      await languageRepo.save(language);
    }
  }

  // Phone Countries
  const phoneCountries = [
    { isoCode: 'TR', name: 'Türkiye', dialCode: '+90' },
    { isoCode: 'US', name: 'United States', dialCode: '+1' },
    { isoCode: 'DE', name: 'Deutschland', dialCode: '+49' },
  ];

  for (const country of phoneCountries) {
    let record = await phoneCountryRepo.findOne({ where: { dialCode: country.dialCode } });
    if (!record) {
      record = phoneCountryRepo.create({ ...country });
      await phoneCountryRepo.save(record);
    }
  }

  // Tenants
  let tourTenant = await tenantRepo.findOne({ where: { slug: 'blue-travel' } });
  if (!tourTenant) {
    tourTenant = tenantRepo.create({
      name: 'Blue Travel',
      slug: 'blue-travel',
      category: TenantCategory.TOUR,
      defaultLanguage: 'en',
      supportEmail: 'support@bluetravel.com',
    });
    tourTenant = await tenantRepo.save(tourTenant);
  }

  // Önce mevcut tenant'ları kontrol et (hem swift-rentals hem berg-rentals için)
  let rentacarTenant = await tenantRepo.findOne({ where: { slug: 'berg-rentals' } });
  if (!rentacarTenant) {
    // Eğer berg-rentals yoksa, swift-rentals'ı da kontrol et
    rentacarTenant = await tenantRepo.findOne({ where: { slug: 'swift-rentals' } });
  }
  
  if (!rentacarTenant) {
    rentacarTenant = tenantRepo.create({
      name: 'Berg Rentals',
      slug: 'berg-rentals',
      category: TenantCategory.RENTACAR,
      defaultLanguage: 'tr',
      supportEmail: 'destek@bergrentals.com',
    });
    rentacarTenant = await tenantRepo.save(rentacarTenant);
  }

  // Tenant Users
  const usersToEnsure: Array<{ tenant: Tenant; name: string; email: string; role: TenantUserRole }> = [
    { tenant: tourTenant, name: 'Elif Kaya', email: 'elif@bluetravel.com', role: TenantUserRole.ADMIN },
    { tenant: rentacarTenant, name: 'Mert Yılmaz', email: 'mert@swiftrentals.com', role: TenantUserRole.ADMIN },
  ];

  for (const userData of usersToEnsure) {
    let user = await userRepo.findOne({ where: { email: userData.email } });
    if (!user) {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      user = userRepo.create({
        tenant: userData.tenant,
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
      });
      await userRepo.save(user);
    }
  }

  // Destinations & Tours for tour tenant
  const english = await languageRepo.findOne({ where: { code: 'en' } });
  const turkish = await languageRepo.findOne({ where: { code: 'tr' } });

  if (!english || !turkish) {
    throw new Error('Languages missing');
  }

  // Get or create Cappadocia destination
  const allDestinations = await DestinationService.list(tourTenant.id);
  let cappadociaDestination = allDestinations.find(d =>
    d.translations?.some(t => t.languageId === turkish.id && t.name === 'Kapadokya Balon Turu')
  );
  
  if (!cappadociaDestination) {
    cappadociaDestination = await DestinationService.create({
      tenantId: tourTenant.id,
      translations: [
        {
          languageId: turkish.id,
          title: 'Kapadokya Balon Turu',
          description: 'Kapadokya, Nevşehir, Türkiye',
        },
      ],
    });
  }

  let balloonTour = await tourRepo.findOne({ where: { slug: 'sunrise-cappadocia-flight', tenantId: tourTenant.id } });
  if (!balloonTour) {
    balloonTour = tourRepo.create({
      tenant: tourTenant,
      destination: cappadociaDestination,
      title: 'Sunrise Cappadocia Flight',
      slug: 'sunrise-cappadocia-flight',
      summary: 'Gün doğumunda balon uçuşu ve kahvaltı.',
      description: 'Profesyonel pilotlarla 60 dakikalık balon turu, hotel transferi ve kahvaltı dahildir.',
      basePrice: 250,
      currencyCode: 'EUR',
      durationHours: 4,
      tags: ['balloon', 'sunrise', 'cappadocia'],
      languages: [english, turkish],
    });
    balloonTour = await tourRepo.save(balloonTour);

    const session = tourSessionRepo.create({
      tour: balloonTour,
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      capacity: 20,
      availableSlots: 15,
      priceOverride: 280,
    });
    await tourSessionRepo.save(session);
  }

  // Payment methods for tenants
  const paymentMethodsToEnsure: Array<{ tenant: Tenant; displayName: string; provider: PaymentProvider; config?: Record<string, unknown> }> = [
    {
      tenant: tourTenant,
      displayName: 'Stripe - Online Ödeme',
      provider: PaymentProvider.STRIPE,
      config: { publishableKey: 'pk_test_123', secretKey: 'sk_test_123' },
    },
    {
      tenant: rentacarTenant,
      displayName: 'Banka Havalesi',
      provider: PaymentProvider.BANK_TRANSFER,
      config: { iban: 'TR00 0000 0000 0000 0000 0000 00', bank: 'Akbank' },
    },
  ];

  for (const paymentData of paymentMethodsToEnsure) {
    const existing = await paymentMethodRepo.findOne({
      where: { tenantId: paymentData.tenant.id, provider: paymentData.provider },
    });
    if (!existing) {
      const paymentMethod = paymentMethodRepo.create({
        tenant: paymentData.tenant,
        displayName: paymentData.displayName,
        provider: paymentData.provider,
        config: paymentData.config,
      });
      await paymentMethodRepo.save(paymentMethod);
    }
  }

  // Vehicles for rentacar tenant
  // Note: Vehicles now require brand and model entities, so we'll skip vehicle seeding
  // or create brands/models first if needed
  // For now, we'll just create vehicles with legacy brand/model fields
  let suvVehicle = await vehicleRepo.findOne({
    where: { tenantId: rentacarTenant.id, brandName: 'Audi', modelName: 'Q7' },
  });
  if (!suvVehicle) {
    suvVehicle = vehicleRepo.create({
      tenantId: rentacarTenant.id,
      brandName: 'Audi',
      modelName: 'Q7',
      year: 2023,
      transmission: TransmissionType.AUTOMATIC,
      fuelType: FuelType.GASOLINE,
      seats: 5,
      luggage: 4,
      largeLuggage: 2,
      smallLuggage: 2,
      doors: 5,
      description: 'Lüks SUV, 4x4 çekiş, panoramik cam tavan.',
      baseRate: 120,
      currencyCode: 'EUR',
    });
    suvVehicle = await vehicleRepo.save(suvVehicle);
  }

  let cityCar = await vehicleRepo.findOne({
    where: { tenantId: rentacarTenant.id, brandName: 'Renault', modelName: 'Clio' },
  });
  if (!cityCar) {
    cityCar = vehicleRepo.create({
      tenantId: rentacarTenant.id,
      brandName: 'Renault',
      modelName: 'Clio',
      year: 2022,
      transmission: TransmissionType.MANUAL,
      fuelType: FuelType.DIESEL,
      seats: 5,
      luggage: 2,
      largeLuggage: 1,
      smallLuggage: 1,
      doors: 5,
      description: 'Ekonomik şehir içi araç.',
      baseRate: 45,
      currencyCode: 'EUR',
    });
    cityCar = await vehicleRepo.save(cityCar);
  }

  const ensurePlate = async (vehicle: Vehicle, plateNumber: string) => {
    let plate = await plateRepo.findOne({ where: { plateNumber } });
    if (!plate) {
      plate = plateRepo.create({
        vehicle,
        plateNumber,
      });
      await plateRepo.save(plate);
    }
  };

  if (suvVehicle) {
    await ensurePlate(suvVehicle, '34 BLU 001');
    await ensurePlate(suvVehicle, '34 BLU 002');

    const months = Array.from({ length: 12 }, (_, idx) => idx + 1);
    for (const month of months) {
      let pricing = await pricingRepo.findOne({ where: { vehicleId: suvVehicle.id, month } });
      if (!pricing) {
        pricing = pricingRepo.create({
          vehicle: suvVehicle,
          season: month >= 6 && month <= 8 ? SeasonName.SUMMER : SeasonName.SPRING,
          month,
          dailyRate: month >= 6 && month <= 8 ? 150 : 110,
          weeklyRate: month >= 6 && month <= 8 ? 900 : 700,
        });
        await pricingRepo.save(pricing);
      }
    }
  }

  if (cityCar) {
    await ensurePlate(cityCar, '06 REN 555');
  }

  // Currencies
  const currencies = [
    { code: CurrencyCode.TRY, name: 'Turkish Lira', symbol: '₺', rateToTry: 1.0, isBaseCurrency: true },
    { code: CurrencyCode.EUR, name: 'Euro', symbol: '€', rateToTry: 35.0, isBaseCurrency: false },
    { code: CurrencyCode.USD, name: 'US Dollar', symbol: '$', rateToTry: 32.0, isBaseCurrency: false },
    { code: CurrencyCode.GBP, name: 'British Pound', symbol: '£', rateToTry: 40.0, isBaseCurrency: false },
  ];

  for (const currencyData of currencies) {
    let currency = await currencyRepo.findOne({ where: { code: currencyData.code } });
    if (!currency) {
      currency = currencyRepo.create({
        ...currencyData,
        isActive: true,
        autoUpdate: !currencyData.isBaseCurrency, // TRY hariç diğerleri otomatik güncellenecek
        lastUpdatedAt: new Date(),
      });
      await currencyRepo.save(currency);
    }
  }

  console.log('✅ Dummy data seeded successfully.');
  await AppDataSource.destroy();
};

seed().catch((error) => {
  console.error('Seed failed', error);
  AppDataSource.destroy().finally(() => process.exit(1));
});

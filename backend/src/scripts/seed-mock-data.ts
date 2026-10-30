import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { Language } from '../modules/shared/entities/language.entity';
import { Currency, CurrencyCode } from '../modules/shared/entities/currency.entity';
import { PhoneCountry } from '../modules/shared/entities/phone-country.entity';
import { Destination } from '../modules/shared/entities/destination.entity';
import { Hotel } from '../modules/shared/entities/hotel.entity';
import { PaymentMethod, PaymentProvider } from '../modules/shared/entities/payment-method.entity';
import { Blog, BlogStatus } from '../modules/shared/entities/blog.entity';
import { Translation } from '../modules/shared/entities/translation.entity';
import { Survey, SurveyStatus } from '../modules/shared/entities/survey.entity';
import { SurveyQuestion, QuestionType } from '../modules/shared/entities/survey-question.entity';
import { EmailTemplate, EmailTemplateType } from '../modules/shared/entities/email-template.entity';
import { Operation } from '../modules/shared/entities/operation.entity';
import { Reservation, ReservationType, ReservationStatus } from '../modules/shared/entities/reservation.entity';
import { Vehicle, FuelType, TransmissionType } from '../modules/rentacar/entities/vehicle.entity';
import { VehicleCategory } from '../modules/rentacar/entities/vehicle-category.entity';
import { VehicleBrand } from '../modules/rentacar/entities/vehicle-brand.entity';
import { VehicleModel } from '../modules/rentacar/entities/vehicle-model.entity';
import { Location } from '../modules/rentacar/entities/location.entity';
import { MasterLocationType } from '../modules/shared/entities/master-location.entity';
import { MasterLocationService } from '../modules/shared/services/master-location.service';
import { LocationService } from '../modules/rentacar/services/location.service';
import { VehiclePlate } from '../modules/rentacar/entities/vehicle-plate.entity';
import { VehiclePricingPeriod, SeasonName } from '../modules/rentacar/entities/vehicle-pricing-period.entity';
import { DayRange } from '../modules/rentacar/entities/location-vehicle-pricing.entity';
import { LocationVehiclePricing } from '../modules/rentacar/entities/location-vehicle-pricing.entity';
import { LocationDeliveryPricing } from '../modules/rentacar/entities/location-delivery-pricing.entity';
import { Tour } from '../modules/tour/entities/tour.entity';
import { TourFeature } from '../modules/tour/entities/tour-feature.entity';
import { TourImage } from '../modules/tour/entities/tour-image.entity';
import { TourInfoItem } from '../modules/tour/entities/tour-info-item.entity';
import { TourPricing } from '../modules/tour/entities/tour-pricing.entity';
import { TourSession } from '../modules/tour/entities/tour-session.entity';
import { TourTimeSlot } from '../modules/tour/entities/tour-time-slot.entity';
import { TransferVehicle, TransferVehicleType, TransferVehicleFeature } from '../modules/transfer/entities/transfer-vehicle.entity';
import { TransferRoute, TransferRouteType } from '../modules/transfer/entities/transfer-route.entity';
import { TransferRoutePoint, RoutePointType } from '../modules/transfer/entities/transfer-route-point.entity';
import { TransferPricing } from '../modules/transfer/entities/transfer-pricing.entity';
import { TransferDriver } from '../modules/transfer/entities/transfer-driver.entity';
import { TransferReservation } from '../modules/transfer/entities/transfer-reservation.entity';
import { ChatRoom, ChatRoomStatus } from '../modules/chat/entities/chat-room.entity';
import { ChatMessage, ChatMessageType, ChatMessageSenderType } from '../modules/chat/entities/chat-message.entity';
import { ChatWidgetToken } from '../modules/chat/entities/chat-widget-token.entity';
import { Customer, CustomerGender, CustomerIdType } from '../modules/shared/entities/customer.entity';
import { CustomerWallet } from '../modules/shared/entities/customer-wallet.entity';
import { WalletTransaction, WalletTransactionType, WalletTransactionSource } from '../modules/shared/entities/wallet-transaction.entity';
import { Coupon, CouponStatus } from '../modules/shared/entities/coupon.entity';
import { Campaign, DiscountType } from '../modules/rentacar/entities/campaign.entity';
import { ContractTemplate, ContractSectionType } from '../modules/rentacar/entities/contract-template.entity';
import { Contract, ContractStatus } from '../modules/rentacar/entities/contract.entity';
import { VehicleDamage, DamageSeverity, DamageStatus } from '../modules/rentacar/entities/vehicle-damage.entity';
import { VehicleMaintenance, MaintenanceType, MaintenanceStatus } from '../modules/rentacar/entities/vehicle-maintenance.entity';
import { VehiclePenalty, PenaltyType, PenaltyStatus } from '../modules/rentacar/entities/vehicle-penalty.entity';
import { CrmPageCategory } from '../modules/crm/entities/crm-page-category.entity';
import { CrmPage } from '../modules/crm/entities/crm-page.entity';
import { MarketplaceListing, ServiceType, CommissionType, ListingStatus } from '../modules/marketplace/entities/marketplace-listing.entity';
import { FinanceCategory, FinanceCategoryType } from '../modules/finance/entities/finance-category.entity';
import { FinanceCari, FinanceCariKind } from '../modules/finance/entities/finance-cari.entity';
import { FinanceTransaction, FinanceTransactionType, FinancePaymentMethod, FinanceTransactionStatus } from '../modules/finance/entities/finance-transaction.entity';
import { RentalPickup, PickupStatus } from '../modules/rentacar/entities/rental-pickup.entity';
import { RentalReturn, ReturnStatus } from '../modules/rentacar/entities/rental-return.entity';
import { VehicleDamageDetection, DetectionStatus } from '../modules/rentacar/entities/vehicle-damage-detection.entity';
import { PricingInsight, InsightType, InsightSeverity, InsightStatus } from '../modules/rentacar/entities/pricing-insight.entity';
import { OccupancyAnalytics } from '../modules/rentacar/entities/occupancy-analytics.entity';
import { ReservationInvoice, InvoiceStatus } from '../modules/shared/entities/reservation-invoice.entity';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const seedMockData = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Get repositories
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const languageRepo = AppDataSource.getRepository(Language);
    const currencyRepo = AppDataSource.getRepository(Currency);
    const phoneCountryRepo = AppDataSource.getRepository(PhoneCountry);
    // DestinationRepo no longer needed, using DestinationService instead
    const hotelRepo = AppDataSource.getRepository(Hotel);
    const paymentMethodRepo = AppDataSource.getRepository(PaymentMethod);
    const blogRepo = AppDataSource.getRepository(Blog);
    const translationRepo = AppDataSource.getRepository(Translation);
    const surveyRepo = AppDataSource.getRepository(Survey);
    const surveyQuestionRepo = AppDataSource.getRepository(SurveyQuestion);
    const emailTemplateRepo = AppDataSource.getRepository(EmailTemplate);
    const operationRepo = AppDataSource.getRepository(Operation);
    const reservationRepo = AppDataSource.getRepository(Reservation);
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const vehicleCategoryRepo = AppDataSource.getRepository(VehicleCategory);
    const vehicleBrandRepo = AppDataSource.getRepository(VehicleBrand);
    const vehicleModelRepo = AppDataSource.getRepository(VehicleModel);
    const locationRepo = AppDataSource.getRepository(Location);
    const vehiclePlateRepo = AppDataSource.getRepository(VehiclePlate);
    const vehiclePricingPeriodRepo = AppDataSource.getRepository(VehiclePricingPeriod);
    const locationVehiclePricingRepo = AppDataSource.getRepository(LocationVehiclePricing);
    const locationDeliveryPricingRepo = AppDataSource.getRepository(LocationDeliveryPricing);
    const tourRepo = AppDataSource.getRepository(Tour);
    const tourFeatureRepo = AppDataSource.getRepository(TourFeature);
    const tourImageRepo = AppDataSource.getRepository(TourImage);
    const tourInfoItemRepo = AppDataSource.getRepository(TourInfoItem);
    const tourPricingRepo = AppDataSource.getRepository(TourPricing);
    const tourSessionRepo = AppDataSource.getRepository(TourSession);
    const tourTimeSlotRepo = AppDataSource.getRepository(TourTimeSlot);
    const transferVehicleRepo = AppDataSource.getRepository(TransferVehicle);
    const transferRouteRepo = AppDataSource.getRepository(TransferRoute);
    const transferRoutePointRepo = AppDataSource.getRepository(TransferRoutePoint);
    const transferPricingRepo = AppDataSource.getRepository(TransferPricing);
    const transferDriverRepo = AppDataSource.getRepository(TransferDriver);
    const transferReservationRepo = AppDataSource.getRepository(TransferReservation);
    const chatRoomRepo = AppDataSource.getRepository(ChatRoom);
    const chatMessageRepo = AppDataSource.getRepository(ChatMessage);
    const chatWidgetTokenRepo = AppDataSource.getRepository(ChatWidgetToken);

    // Get existing tenants
    const tenants = await tenantRepo.find();
    if (tenants.length === 0) {
      console.log('⚠️  No tenants found. Please create tenants first.');
      return;
    }

    const tourTenant = tenants.find(t => t.category === 'tour') || tenants[0];
    const rentacarTenant = tenants.find(t => t.category === 'rentacar') || tenants[0];

    console.log(`📦 Seeding mock data for ${tenants.length} tenant(s)...`);

    // 1. Languages
    console.log('🌐 Seeding languages...');
    const languages = await languageRepo.find();
    if (languages.length === 0) {
      const langData = [
        { code: 'tr', name: 'Türkçe', isActive: true, isDefault: true },
        { code: 'en', name: 'English', isActive: true, isDefault: false },
        { code: 'de', name: 'Deutsch', isActive: true, isDefault: false },
        { code: 'ru', name: 'Русский', isActive: true, isDefault: false },
      ];
      for (const lang of langData) {
        const existing = await languageRepo.findOne({ where: { code: lang.code } });
        if (!existing) {
          await languageRepo.save(languageRepo.create(lang));
        }
      }
    }
    const savedLanguages = await languageRepo.find();
    const trLang = savedLanguages.find(l => l.code === 'tr') || savedLanguages[0];
    const enLang = savedLanguages.find(l => l.code === 'en') || savedLanguages[0];

    // 2. Currencies
    console.log('💰 Seeding currencies...');
    const currencies = await currencyRepo.find();
    if (currencies.length === 0) {
      const currencyData = [
        { code: CurrencyCode.TRY, name: 'Turkish Lira', symbol: '₺', rateToTry: 1.0, isBaseCurrency: true, isActive: true },
        { code: CurrencyCode.EUR, name: 'Euro', symbol: '€', rateToTry: 35.50, isBaseCurrency: false, isActive: true },
        { code: CurrencyCode.USD, name: 'US Dollar', symbol: '$', rateToTry: 32.80, isBaseCurrency: false, isActive: true },
        { code: CurrencyCode.GBP, name: 'British Pound', symbol: '£', rateToTry: 41.20, isBaseCurrency: false, isActive: true },
      ];
      for (const curr of currencyData) {
        const existing = await currencyRepo.findOne({ where: { code: curr.code } });
        if (!existing) {
          await currencyRepo.save(currencyRepo.create({ ...curr, lastUpdatedAt: new Date() }));
        }
      }
    }

    // 3. Phone Countries
    console.log('📞 Seeding phone countries...');
    const phoneCountries = await phoneCountryRepo.find();
    if (phoneCountries.length === 0) {
      const phoneCountryData = [
        { isoCode: 'TR', name: 'Türkiye', dialCode: '+90' },
        { isoCode: 'US', name: 'United States', dialCode: '+1' },
        { isoCode: 'DE', name: 'Germany', dialCode: '+49' },
        { isoCode: 'GB', name: 'United Kingdom', dialCode: '+44' },
        { isoCode: 'RU', name: 'Russia', dialCode: '+7' },
      ];
      for (const pc of phoneCountryData) {
        const existing = await phoneCountryRepo.findOne({ where: { isoCode: pc.isoCode } });
        if (!existing) {
          await phoneCountryRepo.save(phoneCountryRepo.create(pc));
        }
      }
    }
    const savedPhoneCountries = await phoneCountryRepo.find();
    const trPhoneCountry = savedPhoneCountries.find(pc => pc.isoCode === 'TR') || savedPhoneCountries[0];

    // 4. Destinations
    console.log('📍 Seeding destinations...');
    const { DestinationService } = await import('../modules/shared/services/destination.service');
    const { LanguageService } = await import('../modules/shared/services/language.service');
    
    let defaultLanguage = await LanguageService.getDefault();
    if (!defaultLanguage) {
      console.log('⚠️  No default language found. Creating or updating default language (tr)...');
      // Check if 'tr' language exists
      const languageRepo = AppDataSource.getRepository(Language);
      let trLanguage = await languageRepo.findOne({ where: { code: 'tr' } });
      
      if (trLanguage) {
        // Update existing language to be default
        trLanguage.isDefault = true;
        trLanguage.isActive = true;
        await languageRepo.save(trLanguage);
        defaultLanguage = trLanguage;
        console.log('✅ Existing language set as default');
      } else {
        // Create new default language
        defaultLanguage = languageRepo.create({
          code: 'tr',
          name: 'Türkçe',
          isActive: true,
          isDefault: true,
        });
        await languageRepo.save(defaultLanguage);
        console.log('✅ Default language created');
      }
    }

    const destinationData = [
      { name: 'Istanbul', country: 'Turkey', city: 'Istanbul' },
      { name: 'Antalya', country: 'Turkey', city: 'Antalya' },
      { name: 'Bodrum', country: 'Turkey', city: 'Bodrum' },
      { name: 'Cappadocia', country: 'Turkey', city: 'Nevşehir' },
      { name: 'Pamukkale', country: 'Turkey', city: 'Denizli' },
    ];
    const destinations: Destination[] = [];
    
    // Use first tenant for destinations (or create tenant-specific destinations)
    const firstTenant = tenants[0];
    const allDestinations = await DestinationService.list(firstTenant.id);
    
    for (const dest of destinationData) {
      const existing = allDestinations.find(d =>
        d.translations?.some(t => t.languageId === defaultLanguage.id && t.name === dest.name)
      );
      if (existing) {
        destinations.push(existing);
      } else {
        const created = await DestinationService.create({
          tenantId: firstTenant.id,
          translations: [
            {
              languageId: defaultLanguage.id,
              title: dest.name,
              description: `${dest.name}, ${dest.city}, ${dest.country}`,
            },
          ],
        });
        destinations.push(created);
      }
    }

    // 5. Hotels
    console.log('🏨 Seeding hotels...');
    const hotelData = [
      { name: 'Grand Hotel Istanbul', starRating: 5, address: 'Taksim Square, Istanbul', city: 'Istanbul', country: 'Turkey', destination: destinations[0] },
      { name: 'Beach Resort Antalya', starRating: 4.5, address: 'Lara Beach, Antalya', city: 'Antalya', country: 'Turkey', destination: destinations[1] },
      { name: 'Bodrum Marina Hotel', starRating: 4, address: 'Bodrum Marina, Bodrum', city: 'Bodrum', country: 'Turkey', destination: destinations[2] },
      { name: 'Cave Hotel Cappadocia', starRating: 4.5, address: 'Göreme, Nevşehir', city: 'Nevşehir', country: 'Turkey', destination: destinations[3] },
    ];
    const hotels: Hotel[] = [];
    for (const hotel of hotelData) {
      const existing = await hotelRepo.findOne({ where: { name: hotel.name } });
      if (!existing) {
        hotels.push(await hotelRepo.save(hotelRepo.create(hotel)));
      } else {
        hotels.push(existing);
      }
    }

    // 6. Payment Methods
    console.log('💳 Seeding payment methods...');
    for (const tenant of tenants) {
      const existingPayments = await paymentMethodRepo.find({ where: { tenantId: tenant.id } });
      if (existingPayments.length === 0) {
        const paymentData = [
          { tenant, displayName: 'Credit Card', provider: PaymentProvider.CREDIT_CARD, isActive: true, config: {} },
          { tenant, displayName: 'Bank Transfer', provider: PaymentProvider.BANK_TRANSFER, isActive: true, config: {} },
          { tenant, displayName: 'PayPal', provider: PaymentProvider.PAYPAL, isActive: true, config: {} },
        ];
        for (const pm of paymentData) {
          await paymentMethodRepo.save(paymentMethodRepo.create(pm));
        }
      }
    }

    // 7. Vehicle Categories, Brands, Models (Rentacar)
    console.log('🚗 Seeding vehicle data...');
    let categories: VehicleCategory[] = [];
    let locations: Location[] = [];
    let vehicles: Vehicle[] = [];
    
    if (rentacarTenant) {
      // Categories
      categories = [];
      const categoryData = [
        { isActive: true, sortOrder: 1, translations: [{ language: trLang, name: 'Ekonomi' }, { language: enLang, name: 'Economy' }] },
        { isActive: true, sortOrder: 2, translations: [{ language: trLang, name: 'Kompakt' }, { language: enLang, name: 'Compact' }] },
        { isActive: true, sortOrder: 3, translations: [{ language: trLang, name: 'Orta Sınıf' }, { language: enLang, name: 'Mid-Size' }] },
        { isActive: true, sortOrder: 4, translations: [{ language: trLang, name: 'Lüks' }, { language: enLang, name: 'Luxury' }] },
        { isActive: true, sortOrder: 5, translations: [{ language: trLang, name: 'SUV' }, { language: enLang, name: 'SUV' }] },
      ];
      for (const cat of categoryData) {
        const category = vehicleCategoryRepo.create({ isActive: cat.isActive, sortOrder: cat.sortOrder });
        const savedCategory = await vehicleCategoryRepo.save(category);
        for (const trans of cat.translations) {
          await translationRepo.save(translationRepo.create({
            model: 'VehicleCategory',
            modelId: savedCategory.id,
            languageId: trans.language.id,
            name: trans.name,
          }));
        }
        categories.push(savedCategory);
      }

      // Brands
      const brands: VehicleBrand[] = [];
      const brandData = [
        { name: 'Toyota', isActive: true, sortOrder: 1 },
        { name: 'Ford', isActive: true, sortOrder: 2 },
        { name: 'Mercedes-Benz', isActive: true, sortOrder: 3 },
        { name: 'BMW', isActive: true, sortOrder: 4 },
        { name: 'Audi', isActive: true, sortOrder: 5 },
      ];
      for (const brand of brandData) {
        const existing = await vehicleBrandRepo.findOne({ where: { name: brand.name } });
        if (!existing) {
          brands.push(await vehicleBrandRepo.save(vehicleBrandRepo.create(brand)));
        } else {
          brands.push(existing);
        }
      }

      // Models
      const models: VehicleModel[] = [];
      const modelData = [
        { brand: brands[0], name: 'Corolla', isActive: true, sortOrder: 1 },
        { brand: brands[0], name: 'Yaris', isActive: true, sortOrder: 2 },
        { brand: brands[1], name: 'Focus', isActive: true, sortOrder: 1 },
        { brand: brands[2], name: 'C-Class', isActive: true, sortOrder: 1 },
        { brand: brands[3], name: '3 Series', isActive: true, sortOrder: 1 },
        { brand: brands[4], name: 'A4', isActive: true, sortOrder: 1 },
      ];
      for (const model of modelData) {
        const existing = await vehicleModelRepo.findOne({ where: { name: model.name, brandId: model.brand.id } });
        if (!existing) {
          models.push(await vehicleModelRepo.save(vehicleModelRepo.create(model)));
        } else {
          models.push(existing);
        }
      }

      // Locations - Create master locations first, then map to tenant
      locations = [];
      const locationData = [
        { name: 'Istanbul Airport', type: MasterLocationType.HAVALIMANI, sort: 1 },
        { name: 'Antalya Airport', type: MasterLocationType.HAVALIMANI, sort: 2 },
        { name: 'Bodrum Office', type: MasterLocationType.MERKEZ, sort: 3 },
      ];
      for (const locData of locationData) {
        try {
          // Create or get master location
          const existingMasterLocations = await MasterLocationService.list(null);
          let masterLocation = existingMasterLocations.find(ml => ml.name === locData.name && !ml.parentId);
          
          if (!masterLocation) {
            masterLocation = await MasterLocationService.create({
              name: locData.name,
              parentId: null,
              type: locData.type,
            });
          }

          // Check if tenant location already exists
          const existingLocations = await LocationService.list(rentacarTenant.id);
          const existingTenantLoc = existingLocations.find(loc => loc.locationId === masterLocation.id);
          
          if (existingTenantLoc) {
            // Get the Location entity
            const locationEntity = await locationRepo.findOne({ where: { id: existingTenantLoc.id } });
            if (locationEntity) {
              locations.push(locationEntity);
            }
            continue;
          }

          // Create tenant location mapping
          const tenantLocationDto = await LocationService.create({
            tenantId: rentacarTenant.id,
            locationId: masterLocation.id,
            sort: locData.sort,
            deliveryFee: 0,
            dropFee: 0,
            isActive: true,
          });

          // Get the Location entity
          const locationEntity = await locationRepo.findOne({ where: { id: tenantLocationDto.id } });
          if (locationEntity) {
            locations.push(locationEntity);
          }
        } catch (error: any) {
          console.error(`Error creating location ${locData.name}:`, error.message);
        }
      }

      // Vehicles
      const vehiclePrices = [250, 200, 500, 550];
      const vehicleData = [
        { tenant: rentacarTenant, name: 'Toyota Corolla 2023', category: categories[1], brand: brands[0], model: models[0], year: 2023, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.HYBRID, seats: 5, luggage: 2, doors: 4, baseRate: 250, currencyCode: 'TRY', isActive: true },
        { tenant: rentacarTenant, name: 'Ford Focus 2022', category: categories[1], brand: brands[1], model: models[2], year: 2022, transmission: TransmissionType.MANUAL, fuelType: FuelType.GASOLINE, seats: 5, luggage: 2, doors: 4, baseRate: 200, currencyCode: 'TRY', isActive: true },
        { tenant: rentacarTenant, name: 'Mercedes C-Class 2023', category: categories[3], brand: brands[2], model: models[3], year: 2023, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 5, luggage: 2, doors: 4, baseRate: 500, currencyCode: 'TRY', isActive: true },
        { tenant: rentacarTenant, name: 'BMW 3 Series 2023', category: categories[3], brand: brands[3], model: models[4], year: 2023, transmission: TransmissionType.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 5, luggage: 2, doors: 4, baseRate: 550, currencyCode: 'TRY', isActive: true },
      ];
      vehicles = [];
      for (const veh of vehicleData) {
        vehicles.push(await vehicleRepo.save(vehicleRepo.create(veh)));
      }

      // Vehicle Plates
      for (let i = 0; i < vehicles.length; i++) {
        const plate = vehiclePlateRepo.create({
          vehicle: vehicles[i],
          plateNumber: `34ABC${1000 + i}`,
          isActive: true,
        });
        await vehiclePlateRepo.save(plate);
      }

      // Vehicle Pricing Periods
      for (let i = 0; i < vehicles.length; i++) {
        // Summer season (June, July, August)
        for (const month of [6, 7, 8]) {
          const pricingPeriod = vehiclePricingPeriodRepo.create({
            vehicle: vehicles[i],
            season: SeasonName.SUMMER,
            month,
            dailyRate: vehiclePrices[i] * 1.5,
          });
          await vehiclePricingPeriodRepo.save(pricingPeriod);
        }
      }

      // Location Vehicle Pricing
      for (const location of locations) {
        for (let i = 0; i < vehicles.length; i++) {
          // Create pricing for a specific month and day range
          const pricing = locationVehiclePricingRepo.create({
            location,
            vehicle: vehicles[i],
            month: 6, // June
            dayRange: DayRange.RANGE_1_3,
            price: vehiclePrices[i],
            discount: 0,
            minDays: 1,
            isActive: true,
          });
          await locationVehiclePricingRepo.save(pricing);
        }
      }
    }

    // 8. Tours (Tour Tenant)
    console.log('🎫 Seeding tours...');
    if (tourTenant) {
      const tourData = [
        { tenant: tourTenant, destination: destinations[0], title: 'Istanbul Tour', slug: 'istanbul-tour', basePrice: 100, currencyCode: 'EUR', durationHours: 8, maxCapacity: 30, isActive: true, translations: [{ language: trLang, title: 'Istanbul Turu', description: 'İstanbul\'un tarihi yerlerini keşfedin' }, { language: enLang, title: 'Istanbul Tour', description: 'Discover Istanbul\'s historical sites' }] },
        { tenant: tourTenant, destination: destinations[1], title: 'Antalya City Tour', slug: 'antalya-city-tour', basePrice: 80, currencyCode: 'EUR', durationHours: 6, maxCapacity: 25, isActive: true, translations: [{ language: trLang, title: 'Antalya Şehir Turu', description: 'Antalya\'nın güzelliklerini keşfedin' }, { language: enLang, title: 'Antalya City Tour', description: 'Discover the beauty of Antalya' }] },
        { tenant: tourTenant, destination: destinations[3], title: 'Cappadocia Balloon Tour', slug: 'cappadocia-balloon-tour', basePrice: 200, currencyCode: 'EUR', durationHours: 4, maxCapacity: 20, isActive: true, translations: [{ language: trLang, title: 'Kapadokya Balon Turu', description: 'Kapadokya\'da balon turu deneyimi' }, { language: enLang, title: 'Cappadocia Balloon Tour', description: 'Hot air balloon experience in Cappadocia' }] },
      ];
      for (const tour of tourData) {
        const savedTour = await tourRepo.save(tourRepo.create({
          tenant: tour.tenant,
          destination: tour.destination,
          title: tour.title,
          slug: tour.slug,
          basePrice: tour.basePrice,
          currencyCode: tour.currencyCode,
          durationHours: tour.durationHours,
          maxCapacity: tour.maxCapacity,
          isActive: tour.isActive,
        }));
        for (const trans of tour.translations) {
          const valueData: any = {};
          if (trans.description) valueData.description = trans.description;
          
          await translationRepo.save(translationRepo.create({
            model: 'Tour',
            modelId: savedTour.id,
            languageId: trans.language.id,
            name: trans.title,
            value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
          }));
        }
      }
    }

    // 9. Transfer Vehicles
    console.log('🚐 Seeding transfer vehicles...');
    for (const tenant of tenants) {
      const existingTransferVehicles = await transferVehicleRepo.find({ where: { tenantId: tenant.id } });
      if (existingTransferVehicles.length === 0) {
        const transferVehicleData = [
          { tenant, name: 'VIP Mercedes Vito', type: TransferVehicleType.VIP, passengerCapacity: 8, luggageCapacity: 4, hasDriver: true, features: [TransferVehicleFeature.WIFI, TransferVehicleFeature.DRINKS], isActive: true, sortOrder: 1 },
          { tenant, name: 'Premium Shuttle', type: TransferVehicleType.PREMIUM, passengerCapacity: 16, luggageCapacity: 8, hasDriver: true, features: [TransferVehicleFeature.WIFI], isActive: true, sortOrder: 2 },
          { tenant, name: 'Luxury S-Class', type: TransferVehicleType.LUXURY, passengerCapacity: 4, luggageCapacity: 2, hasDriver: true, features: [TransferVehicleFeature.WIFI, TransferVehicleFeature.DRINKS, TransferVehicleFeature.NEWSPAPER], isActive: true, sortOrder: 3 },
        ];
        for (const tv of transferVehicleData) {
          await transferVehicleRepo.save(transferVehicleRepo.create(tv));
        }
      }
    }

    // 10. Transfer Routes & Points
    console.log('🗺️  Seeding transfer routes...');
    for (const tenant of tenants) {
      const existingRoutes = await transferRouteRepo.find({ where: { tenantId: tenant.id } });
      if (existingRoutes.length === 0) {
        const routeData = [
          { tenant, name: 'Istanbul Airport → City Center', type: TransferRouteType.AIRPORT_TO_HOTEL, distance: 50, averageDurationMinutes: 60, isActive: true, sortOrder: 1 },
          { tenant, name: 'Antalya Airport → Lara Beach', type: TransferRouteType.AIRPORT_TO_HOTEL, distance: 15, averageDurationMinutes: 25, isActive: true, sortOrder: 2 },
        ];
        for (const route of routeData) {
          const savedRoute = await transferRouteRepo.save(transferRouteRepo.create(route));
          // Create route points
          await transferRoutePointRepo.save(transferRoutePointRepo.create({
            route: savedRoute,
            name: savedRoute.name.includes('Istanbul') ? 'IST Airport' : 'Antalya Airport',
            type: RoutePointType.AIRPORT,
            isPickup: true,
            isActive: true,
            latitude: savedRoute.name.includes('Istanbul') ? '41.2753' : '36.9012',
            longitude: savedRoute.name.includes('Istanbul') ? '28.7519' : '30.7928',
          }));
          await transferRoutePointRepo.save(transferRoutePointRepo.create({
            route: savedRoute,
            name: savedRoute.name.includes('Lara') ? 'Lara Beach Hotel' : 'Istanbul City Center',
            type: savedRoute.name.includes('Lara') ? RoutePointType.HOTEL : RoutePointType.CITY_CENTER,
            isPickup: false,
            isActive: true,
            latitude: savedRoute.name.includes('Lara') ? '36.8563' : '41.0082',
            longitude: savedRoute.name.includes('Lara') ? '30.8397' : '28.9784',
          }));
        }
      }
    }

    // 11. Transfer Drivers
    console.log('👨‍✈️ Seeding transfer drivers...');
    for (const tenant of tenants) {
      const existingDrivers = await transferDriverRepo.find({ where: { tenantId: tenant.id } });
      if (existingDrivers.length === 0) {
        const driverData = [
          { tenant, name: 'Ahmet Yılmaz', phone: '+905551234567', email: 'ahmet@example.com', licenseNumber: 'LIC123456', isActive: true, isAvailable: true },
          { tenant, name: 'Mehmet Demir', phone: '+905559876543', email: 'mehmet@example.com', licenseNumber: 'LIC789012', isActive: true, isAvailable: true },
          { tenant, name: 'Ali Kaya', phone: '+905557654321', email: 'ali@example.com', licenseNumber: 'LIC345678', isActive: true, isAvailable: true },
        ];
        for (const driver of driverData) {
          await transferDriverRepo.save(transferDriverRepo.create(driver));
        }
      }
    }

    // 12. Blogs
    console.log('📝 Seeding blogs...');
    for (const tenant of tenants) {
      const existingBlogs = await blogRepo.find({ where: { tenantId: tenant.id } });
      if (existingBlogs.length === 0) {
        const blogData = [
          { tenant, title: 'Istanbul Travel Guide', slug: 'istanbul-travel-guide', content: 'Comprehensive guide to Istanbul...', status: BlogStatus.PUBLISHED, publishedAt: new Date() },
          { tenant, title: 'Best Beaches in Antalya', slug: 'best-beaches-antalya', content: 'Discover the most beautiful beaches...', status: BlogStatus.PUBLISHED, publishedAt: new Date() },
        ];
        for (const blog of blogData) {
          await blogRepo.save(blogRepo.create(blog));
        }
      }
    }

    // 13. Surveys
    console.log('📊 Seeding surveys...');
    for (const tenant of tenants) {
      const existingSurveys = await surveyRepo.find({ where: { tenantId: tenant.id } });
      if (existingSurveys.length === 0) {
        const survey = await surveyRepo.save(surveyRepo.create({
          tenant,
          language: trLang,
          title: 'Müşteri Memnuniyet Anketi',
          description: 'Deneyiminizi değerlendirin',
          status: SurveyStatus.ACTIVE,
          isActive: true,
          autoSend: true,
          sendAfterDays: 1,
          emailSubject: 'Deneyiminizi Değerlendirin',
        }));
        // Survey Questions
        await surveyQuestionRepo.save(surveyQuestionRepo.create({
          survey,
          question: 'Genel memnuniyetiniz nedir?',
          type: QuestionType.RATING,
          isRequired: true,
          sortOrder: 1,
        }));
        await surveyQuestionRepo.save(surveyQuestionRepo.create({
          survey,
          question: 'Önerileriniz var mı?',
          type: QuestionType.TEXT,
          isRequired: false,
          sortOrder: 2,
        }));
      }
    }

    // 14. Email Templates
    console.log('📧 Seeding email templates...');
    for (const tenant of tenants) {
      const existingTemplates = await emailTemplateRepo.find({ where: { tenantId: tenant.id } });
      if (existingTemplates.length === 0) {
        const templateData = [
          {
            tenant,
            language: trLang,
            type: EmailTemplateType.RESERVATION_CONFIRMATION,
            name: 'Rezervasyon Onay',
            subject: 'Rezervasyonunuz Onaylandı - {{reference}}',
            body: '<p>Sayın {{customerName}},</p><p>Rezervasyonunuz başarıyla onaylanmıştır.</p><p>Referans: {{reference}}</p>',
            isActive: true,
          },
          {
            tenant,
            language: enLang,
            type: EmailTemplateType.RESERVATION_CONFIRMATION,
            name: 'Reservation Confirmation',
            subject: 'Your Reservation Confirmed - {{reference}}',
            body: '<p>Dear {{customerName}},</p><p>Your reservation has been confirmed.</p><p>Reference: {{reference}}</p>',
            isActive: true,
          },
        ];
        for (const template of templateData) {
          await emailTemplateRepo.save(emailTemplateRepo.create(template));
        }
      }
    }

    // 15. Operations
    console.log('📋 Seeding operations...');
    for (const tenant of tenants) {
      const existingOps = await operationRepo.find({ where: { tenantId: tenant.id } });
      if (existingOps.length === 0) {
        const opData = [
          { tenant, type: 'vehicle_created', performedBy: 'System', performedAt: new Date(), details: { vehicleId: 'mock-vehicle-1' } },
          { tenant, type: 'reservation_created', performedBy: 'System', performedAt: new Date(), details: { reservationId: 'mock-reservation-1' } },
        ];
        for (const op of opData) {
          await operationRepo.save(operationRepo.create(op));
        }
      }
    }

    // 16. Reservations
    console.log('📅 Seeding reservations...');
    for (const tenant of tenants) {
      const existingReservations = await reservationRepo.find({ where: { tenantId: tenant.id } });
      if (existingReservations.length === 0) {
        const checkIn = new Date();
        checkIn.setDate(checkIn.getDate() + 7);
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + 3);
        const reservationData = [
          {
            tenant,
            reference: `RES-${Date.now()}-1`,
            type: tenant.category === 'tour' ? ReservationType.TOUR : ReservationType.RENTACAR,
            status: ReservationStatus.CONFIRMED,
            customerName: 'Ahmet Yılmaz',
            customerEmail: 'ahmet@example.com',
            customerPhone: '+905551234567',
            customerPhoneCountry: trPhoneCountry,
            customerLanguage: trLang,
            checkIn,
            checkOut,
          },
          {
            tenant,
            reference: `RES-${Date.now()}-2`,
            type: tenant.category === 'tour' ? ReservationType.TOUR : ReservationType.RENTACAR,
            status: ReservationStatus.PENDING,
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
            customerPhone: '+1234567890',
            customerLanguage: enLang,
            checkIn,
            checkOut,
          },
        ];
        for (const res of reservationData) {
          await reservationRepo.save(reservationRepo.create(res));
        }
      }
    }

    // 17. Chat Widget Tokens
    console.log('💬 Seeding chat widget tokens...');
    for (const tenant of tenants) {
      const existingToken = await chatWidgetTokenRepo.findOne({ where: { tenantId: tenant.id } });
      if (!existingToken) {
        const publicKey = crypto.randomBytes(32).toString('hex');
        const secretKey = crypto.randomBytes(64).toString('hex');
        await chatWidgetTokenRepo.save(chatWidgetTokenRepo.create({
          tenant,
          publicKey,
          secretKey,
          isActive: true,
        }));
      }
    }

    // 18. Chat Rooms & Messages
    console.log('💬 Seeding chat rooms...');
    for (const tenant of tenants) {
      const existingRooms = await chatRoomRepo.find({ where: { tenantId: tenant.id } });
      if (existingRooms.length === 0) {
        const room = await chatRoomRepo.save(chatRoomRepo.create({
          tenant,
          title: 'Visitor Inquiry',
          status: ChatRoomStatus.ACTIVE,
          visitorId: `visitor-${Date.now()}`,
          visitorName: 'Test Visitor',
          visitorEmail: 'visitor@example.com',
          visitorPhone: '+905551234567',
        }));
        await chatMessageRepo.save(chatMessageRepo.create({
          room,
          senderType: ChatMessageSenderType.VISITOR,
          messageType: ChatMessageType.TEXT,
          content: 'Hello, I need help with my reservation.',
          isRead: false,
        }));
      }
    }

    // 19. Customers
    console.log('👥 Seeding customers...');
    const customerRepo = AppDataSource.getRepository(Customer);
    const customerWalletRepo = AppDataSource.getRepository(CustomerWallet);
    const walletTransactionRepo = AppDataSource.getRepository(WalletTransaction);
    const customers: Customer[] = [];
    
    for (const tenant of tenants) {
      const existingCustomers = await customerRepo.find({ where: { tenantId: tenant.id } });
      if (existingCustomers.length === 0) {
        const customerData = [
          {
            tenant,
            firstName: 'Ahmet',
            lastName: 'Yılmaz',
            fullName: 'Ahmet Yılmaz',
            email: 'ahmet@example.com',
            mobilePhone: '+905551234567',
            country: 'TR',
            language: trLang,
            gender: CustomerGender.MALE,
            birthDate: new Date('1990-01-15'),
            idType: CustomerIdType.TC,
            idNumber: '12345678901',
            isActive: true,
            isBlacklisted: false,
          },
          {
            tenant,
            firstName: 'John',
            lastName: 'Doe',
            fullName: 'John Doe',
            email: 'john@example.com',
            mobilePhone: '+1234567890',
            country: 'US',
            language: enLang,
            gender: CustomerGender.MALE,
            birthDate: new Date('1985-05-20'),
            idType: CustomerIdType.PASSPORT,
            idNumber: 'P123456',
            isActive: true,
            isBlacklisted: false,
          },
          {
            tenant,
            firstName: 'Maria',
            lastName: 'Schmidt',
            fullName: 'Maria Schmidt',
            email: 'maria@example.com',
            mobilePhone: '+49123456789',
            country: 'DE',
            language: savedLanguages.find(l => l.code === 'de') || enLang,
            gender: CustomerGender.FEMALE,
            birthDate: new Date('1992-08-10'),
            idType: CustomerIdType.PASSPORT,
            idNumber: 'P789012',
            isActive: true,
            isBlacklisted: false,
          },
        ];
        for (const cust of customerData) {
          const customer = await customerRepo.save(customerRepo.create(cust));
          customers.push(customer);
          
          // Create wallet for customer
          const wallet = await customerWalletRepo.save(customerWalletRepo.create({
            tenant,
            customer,
            balance: Math.floor(Math.random() * 1000) + 100,
            totalEarned: Math.floor(Math.random() * 2000) + 500,
            totalSpent: Math.floor(Math.random() * 500),
          }));
          
          // Add some wallet transactions
          for (let i = 0; i < 3; i++) {
            const amount = Math.floor(Math.random() * 200) + 50;
            const balanceBefore = wallet.balance;
            const balanceAfter = i === 0 ? balanceBefore + amount : balanceBefore - amount;
            
            await walletTransactionRepo.save(walletTransactionRepo.create({
              wallet,
              tenantId: tenant.id,
              customerId: customer.id,
              type: i === 0 ? WalletTransactionType.CREDIT : WalletTransactionType.DEBIT,
              source: i === 0 ? WalletTransactionSource.RESERVATION_COMPLETION : WalletTransactionSource.COUPON_GENERATION,
              amount,
              balanceBefore,
              balanceAfter,
              description: i === 0 ? 'Points earned from reservation' : 'Points used for coupon',
              reason: i === 0 ? 'reservation_completion' : 'coupon_generation',
            }));
          }
        }
      } else {
        customers.push(...existingCustomers);
      }
    }

    // 20. Coupons
    console.log('🎫 Seeding coupons...');
    const couponRepo = AppDataSource.getRepository(Coupon);
    for (const tenant of tenants) {
      const existingCoupons = await couponRepo.find({ where: { tenantId: tenant.id } });
      if (existingCoupons.length === 0 && customers.length > 0) {
        const couponData = [
          {
            tenant,
            code: `COUPON${Date.now()}1`,
            value: 100,
            currencyCode: 'TRY',
            pointsUsed: 100,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            isSingleUse: true,
            isUsed: false,
            status: CouponStatus.ACTIVE,
            customer: customers[0],
            description: 'Test coupon 1',
          },
          {
            tenant,
            code: `COUPON${Date.now()}2`,
            value: 200,
            currencyCode: 'TRY',
            pointsUsed: 200,
            expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            isSingleUse: true,
            isUsed: true,
            status: CouponStatus.USED,
            customer: customers[1],
            description: 'Test coupon 2 (used)',
          },
        ];
        for (const coupon of couponData) {
          await couponRepo.save(couponRepo.create(coupon));
        }
      }
    }

    // 21. Campaigns (Rentacar)
    console.log('🎯 Seeding campaigns...');
    const campaignRepo = AppDataSource.getRepository(Campaign);
    if (rentacarTenant && locations.length > 0 && vehicles.length > 0) {
      const existingCampaigns = await campaignRepo.find({ where: { tenantId: rentacarTenant.id } });
      if (existingCampaigns.length === 0) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);
        
        const campaignData = [
          {
            tenant: rentacarTenant,
            name: 'Yaz Kampanyası',
            description: 'Yaz ayları için özel indirim',
            pickupLocation: locations[0],
            vehicle: null,
            category: categories[0],
            minRentalDays: 3,
            discountType: DiscountType.PERCENTAGE,
            discountPercent: 15,
            discountFixed: null,
            startDate,
            endDate,
            priority: 1,
            isActive: true,
          },
          {
            tenant: rentacarTenant,
            name: 'Lüks Araç İndirimi',
            description: 'Lüks araçlar için özel fiyat',
            pickupLocation: locations[0],
            vehicle: vehicles[2],
            category: null,
            minRentalDays: 5,
            discountType: DiscountType.PERCENTAGE,
            discountPercent: 20,
            discountFixed: null,
            startDate,
            endDate,
            priority: 2,
            isActive: true,
          },
        ];
        for (const camp of campaignData) {
          await campaignRepo.save(campaignRepo.create(camp));
        }
      }
    }

    // 22. Contract Templates
    console.log('📄 Seeding contract templates...');
    const contractTemplateRepo = AppDataSource.getRepository(ContractTemplate);
    for (const tenant of tenants) {
      const existingTemplates = await contractTemplateRepo.find({ where: { tenantId: tenant.id } });
      if (existingTemplates.length === 0) {
        const template = await contractTemplateRepo.save(contractTemplateRepo.create({
          tenant,
          name: 'Standart Kiralama Sözleşmesi',
          description: 'Araç kiralama için standart sözleşme şablonu',
          primaryColor: '#2563EB',
          secondaryColor: '#10B981',
          textColor: '#000000',
          sections: [
            {
              id: 'header',
              type: ContractSectionType.HEADER,
              title: 'Sözleşme Başlığı',
              content: 'ARAÇ KİRALAMA SÖZLEŞMESİ',
              isLocked: false,
              order: 1,
              isVisible: true,
            },
            {
              id: 'legal1',
              type: ContractSectionType.LEGAL_CORE,
              title: 'Genel Şartlar',
              content: 'Bu sözleşme, araç kiralama işlemlerini düzenler...',
              isLocked: true,
              order: 2,
              isVisible: true,
            },
            {
              id: 'custom1',
              type: ContractSectionType.CUSTOM,
              title: 'Özel Şartlar',
              content: 'Kiracı, aracı dikkatli kullanmakla yükümlüdür...',
              isLocked: false,
              order: 3,
              isVisible: true,
            },
          ],
          optionalBlocks: [
            {
              id: 'opt1',
              title: 'Ekstra Hizmetler',
              content: 'GPS, çocuk koltuğu gibi ekstra hizmetler...',
              isEnabled: true,
              order: 1,
            },
          ],
          variables: {
            customerName: { label: 'Müşteri Adı', required: true },
            vehicleName: { label: 'Araç Adı', required: true },
            rentalDays: { label: 'Kiralama Günü', required: true },
            totalPrice: { label: 'Toplam Fiyat', required: true },
          },
          isActive: true,
          isDefault: true,
        }));
      }
    }

    // 23. Vehicle Damages, Maintenances, Penalties
    console.log('🚗 Seeding vehicle timeline events...');
    const vehicleDamageRepo = AppDataSource.getRepository(VehicleDamage);
    const vehicleMaintenanceRepo = AppDataSource.getRepository(VehicleMaintenance);
    const vehiclePenaltyRepo = AppDataSource.getRepository(VehiclePenalty);
    const savedReservations = await reservationRepo.find({ take: 2 });
    
    if (rentacarTenant && vehicles.length > 0) {
      // Damages
      for (let i = 0; i < Math.min(2, vehicles.length); i++) {
        const existingDamages = await vehicleDamageRepo.find({ where: { vehicleId: vehicles[i].id } });
        if (existingDamages.length === 0) {
          await vehicleDamageRepo.save(vehicleDamageRepo.create({
            tenant: rentacarTenant,
            vehicle: vehicles[i],
            reservation: savedReservations[i] || null,
            date: new Date(),
            title: 'Ön tampon çizik',
            description: 'Araç ön tamponunda hafif çizik tespit edildi',
            severity: DamageSeverity.MINOR,
            status: DamageStatus.REPORTED,
            repairCost: 500,
            currencyCode: 'TRY',
            reportedBy: 'Ahmet Yılmaz',
          }));
        }
      }
      
      // Maintenances
      for (let i = 0; i < Math.min(2, vehicles.length); i++) {
        const existingMaintenances = await vehicleMaintenanceRepo.find({ where: { vehicleId: vehicles[i].id } });
        if (existingMaintenances.length === 0) {
          await vehicleMaintenanceRepo.save(vehicleMaintenanceRepo.create({
            tenant: rentacarTenant,
            vehicle: vehicles[i],
            date: new Date(),
            title: 'Periyodik Bakım',
            description: 'Motor yağı ve filtre değişimi yapıldı',
            type: MaintenanceType.OIL_CHANGE,
            status: MaintenanceStatus.COMPLETED,
            cost: 800,
            currencyCode: 'TRY',
            serviceProvider: 'Oto Servis Merkezi',
            odometerReading: 50000 + i * 1000,
            performedBy: 'Mehmet Demir',
          }));
        }
      }
      
      // Penalties
      for (let i = 0; i < Math.min(1, vehicles.length); i++) {
        const existingPenalties = await vehiclePenaltyRepo.find({ where: { vehicleId: vehicles[i].id } });
        if (existingPenalties.length === 0) {
          await vehiclePenaltyRepo.save(vehiclePenaltyRepo.create({
            tenant: rentacarTenant,
            vehicle: vehicles[i],
            reservation: savedReservations[0] || null,
            date: new Date(),
            title: 'HGS Geçiş Ücreti',
            description: 'İstanbul-Ankara otoyolu HGS geçiş ücreti',
            type: PenaltyType.HGS,
            status: PenaltyStatus.PENDING,
            amount: 150,
            currencyCode: 'TRY',
            location: 'İstanbul-Ankara Otoyolu',
          }));
        }
      }
    }

    // 24. CRM Pages
    console.log('📝 Seeding CRM pages...');
    const crmPageCategoryRepo = AppDataSource.getRepository(CrmPageCategory);
    const crmPageRepo = AppDataSource.getRepository(CrmPage);
    
    for (const tenant of tenants) {
      const existingCategories = await crmPageCategoryRepo.find({ where: { tenantId: tenant.id } });
      let category: CrmPageCategory;
      
      if (existingCategories.length === 0) {
        category = await crmPageCategoryRepo.save(crmPageCategoryRepo.create({
          tenant,
          slug: 'genel-bilgiler',
          sortOrder: 1,
          isActive: true,
        }));
        
        // Add translations for category
        await translationRepo.save(translationRepo.create({
          model: 'CrmPageCategory',
          modelId: category.id,
          languageId: trLang.id,
          name: 'Genel Bilgiler',
        }));
        await translationRepo.save(translationRepo.create({
          model: 'CrmPageCategory',
          modelId: category.id,
          languageId: enLang.id,
          name: 'General Information',
        }));
      } else {
        category = existingCategories[0];
      }
      
      const existingPages = await crmPageRepo.find({ where: { tenantId: tenant.id } });
      if (existingPages.length === 0) {
        const page = await crmPageRepo.save(crmPageRepo.create({
          tenant,
          category,
          slug: 'gizlilik-politikasi',
          isActive: true,
          sortOrder: 1,
          viewCount: 0,
        }));
        
        // Add translations for page
        await translationRepo.save(translationRepo.create({
          model: 'CrmPage',
          modelId: page.id,
          languageId: trLang.id,
          name: 'Gizlilik Politikası',
          value: JSON.stringify({ description: 'Gizlilik politikamız hakkında bilgiler...' }),
        }));
        await translationRepo.save(translationRepo.create({
          model: 'CrmPage',
          modelId: page.id,
          languageId: enLang.id,
          name: 'Privacy Policy',
          value: JSON.stringify({ description: 'Information about our privacy policy...' }),
        }));
      }
    }

    // 25. Marketplace Listings
    console.log('🏪 Seeding marketplace listings...');
    const marketplaceListingRepo = AppDataSource.getRepository(MarketplaceListing);
    
    for (const tenant of tenants) {
      const existingListings = await marketplaceListingRepo.find({ where: { tenantId: tenant.id } });
      if (existingListings.length === 0) {
        const listingData = [
          {
            tenant,
            title: 'VIP Transfer Hizmeti',
            description: 'Havalimanı transfer hizmeti sunuyoruz',
            serviceType: ServiceType.TRANSFER,
            commissionType: CommissionType.PERCENTAGE,
            commissionRate: 10,
            commissionFixed: null,
            basePrice: 500,
            currencyCode: 'TRY',
            isAvailable: true,
            status: ListingStatus.ACTIVE,
            approvedAt: new Date(),
            contactEmail: 'transfer@example.com',
            contactPhone: '+905551234567',
          },
          {
            tenant,
            title: 'Seyahat Sigortası',
            description: 'Kapsamlı seyahat sigortası paketi',
            serviceType: ServiceType.INSURANCE,
            commissionType: CommissionType.FIXED,
            commissionRate: null,
            commissionFixed: 50,
            basePrice: 200,
            currencyCode: 'TRY',
            isAvailable: true,
            status: ListingStatus.ACTIVE,
            approvedAt: new Date(),
            contactEmail: 'insurance@example.com',
            contactPhone: '+905559876543',
          },
        ];
        for (const listing of listingData) {
          await marketplaceListingRepo.save(marketplaceListingRepo.create(listing));
        }
      }
    }

    // 26. Finance Data
    console.log('💰 Seeding finance data...');
    const financeCategoryRepo = AppDataSource.getRepository(FinanceCategory);
    const financeCariRepo = AppDataSource.getRepository(FinanceCari);
    const financeTransactionRepo = AppDataSource.getRepository(FinanceTransaction);
    
    for (const tenant of tenants) {
      // Categories
      const existingCategories = await financeCategoryRepo.find({ where: { tenantId: tenant.id } });
      let incomeCategory: FinanceCategory;
      let expenseCategory: FinanceCategory;
      
      if (existingCategories.length === 0) {
        incomeCategory = await financeCategoryRepo.save(financeCategoryRepo.create({
          tenant,
          name: 'Rezervasyon Gelirleri',
          type: FinanceCategoryType.INCOME,
          isActive: true,
        }));
        expenseCategory = await financeCategoryRepo.save(financeCategoryRepo.create({
          tenant,
          name: 'Operasyonel Giderler',
          type: FinanceCategoryType.EXPENSE,
          isActive: true,
        }));
      } else {
        incomeCategory = existingCategories.find(c => c.type === FinanceCategoryType.INCOME) || existingCategories[0];
        expenseCategory = existingCategories.find(c => c.type === FinanceCategoryType.EXPENSE) || existingCategories[0];
      }
      
      // Cari
      const existingCari = await financeCariRepo.find({ where: { tenantId: tenant.id } });
      let cari: FinanceCari;
      
      if (existingCari.length === 0) {
        cari = await financeCariRepo.save(financeCariRepo.create({
          tenant,
          title: 'Test Müşteri',
          code: 'CARI001',
          kind: FinanceCariKind.PERSON,
          balanceOpening: 0,
          currency: 'TRY',
          isActive: true,
        }));
      } else {
        cari = existingCari[0];
      }
      
      // Transactions
      const existingTransactions = await financeTransactionRepo.find({ where: { tenantId: tenant.id } });
      if (existingTransactions.length === 0) {
        const transactionData = [
          {
            tenant,
            type: FinanceTransactionType.INCOME,
            date: new Date(),
            amount: 5000,
            currency: 'TRY',
            category: incomeCategory,
            cari: cari,
            paymentMethod: FinancePaymentMethod.TRANSFER,
            description: 'Rezervasyon geliri',
            status: FinanceTransactionStatus.PAID,
          },
          {
            tenant,
            type: FinanceTransactionType.EXPENSE,
            date: new Date(),
            amount: 2000,
            currency: 'TRY',
            category: expenseCategory,
            cari: null,
            paymentMethod: FinancePaymentMethod.CASH,
            description: 'Operasyonel gider',
            status: FinanceTransactionStatus.PAID,
          },
        ];
        for (const trans of transactionData) {
          await financeTransactionRepo.save(financeTransactionRepo.create(trans));
        }
      }
    }

    // 27. Rental Pickups & Returns
    console.log('🚙 Seeding rental pickups and returns...');
    const rentalPickupRepo = AppDataSource.getRepository(RentalPickup);
    const rentalReturnRepo = AppDataSource.getRepository(RentalReturn);
    
    if (rentacarTenant && savedReservations.length > 0) {
      const existingPickups = await rentalPickupRepo.find({ where: { tenantId: rentacarTenant.id } });
      if (existingPickups.length === 0) {
        for (const reservation of savedReservations.slice(0, 2)) {
          await rentalPickupRepo.save(rentalPickupRepo.create({
            tenant: rentacarTenant,
            reservation,
            odometerKm: 50000 + Math.floor(Math.random() * 1000),
            fuelLevel: 'full',
            status: PickupStatus.COMPLETED,
            completedAt: new Date(),
          }));
        }
      }
    }

    // 28. Vehicle Damage Detections
    console.log('🔍 Seeding vehicle damage detections...');
    const vehicleDamageDetectionRepo = AppDataSource.getRepository(VehicleDamageDetection);
    
    if (rentacarTenant && vehicles.length > 0 && savedReservations.length > 0) {
      const existingDetections = await vehicleDamageDetectionRepo.find({ where: { tenantId: rentacarTenant.id } });
      if (existingDetections.length === 0) {
        await vehicleDamageDetectionRepo.save(vehicleDamageDetectionRepo.create({
          tenant: rentacarTenant,
          vehicle: vehicles[0],
          reservation: savedReservations[0],
          checkinPhotoUrls: ['/photos/checkin1.jpg', '/photos/checkin2.jpg'],
          checkoutPhotoUrls: ['/photos/checkout1.jpg', '/photos/checkout2.jpg'],
          damageProbability: 45.5,
          confidenceScore: 0.78,
          status: DetectionStatus.COMPLETED,
          damagedAreas: [{ x: 0.1, y: 0.2, width: 0.05, height: 0.03, confidence: 78, type: 'scratch' }],
          processingMetadata: {
            pixelDifference: 0.3,
            edgeDifference: 0.25,
            processingTime: 1500,
            imageDimensions: { width: 1920, height: 1080 },
          },
        }));
      }
    }

    // 29. Pricing Insights
    console.log('📊 Seeding pricing insights...');
    const pricingInsightRepo = AppDataSource.getRepository(PricingInsight);
    
    if (rentacarTenant && vehicles.length > 0) {
      const existingInsights = await pricingInsightRepo.find({ where: { tenantId: rentacarTenant.id } });
      if (existingInsights.length === 0) {
        await pricingInsightRepo.save(pricingInsightRepo.create({
          tenant: rentacarTenant,
          vehicle: vehicles[0],
          type: InsightType.UNDERPRICED,
          severity: InsightSeverity.WARNING,
          status: InsightStatus.ACTIVE,
          title: 'Araç Fiyatı Düşük',
          reasoning: 'Bu araç için önerilen fiyat mevcut fiyattan %15 daha yüksek. Piyasa analizi ve talep verilerine göre fiyat artırılabilir.',
          currentPrice: 250,
          recommendedPrice: 287.5,
          marketAveragePrice: 300,
        }));
      }
    }

    // 30. Occupancy Analytics
    console.log('📈 Seeding occupancy analytics...');
    const occupancyAnalyticsRepo = AppDataSource.getRepository(OccupancyAnalytics);
    
    if (rentacarTenant && vehicles.length > 0 && locations.length > 0) {
      const existingAnalytics = await occupancyAnalyticsRepo.find({ where: { tenantId: rentacarTenant.id } });
      if (existingAnalytics.length === 0) {
        const date = new Date();
        date.setDate(date.getDate() - 7); // 7 days ago
        
        await occupancyAnalyticsRepo.save(occupancyAnalyticsRepo.create({
          tenant: rentacarTenant,
          vehicle: vehicles[0],
          location: locations[0],
          date,
          periodType: 'daily',
          totalDays: 30,
          bookedDays: 20,
          occupancyRate: 66.67,
          averageDailyPrice: 250,
          minDailyPrice: 200,
          maxDailyPrice: 300,
        }));
      }
    }

    // 31. Reservation Invoices
    console.log('🧾 Seeding reservation invoices...');
    const reservationInvoiceRepo = AppDataSource.getRepository(ReservationInvoice);
    
    if (rentacarTenant && savedReservations.length > 0) {
      const existingInvoices = await reservationInvoiceRepo.find({ where: { tenantId: rentacarTenant.id } });
      if (existingInvoices.length === 0) {
        await reservationInvoiceRepo.save(reservationInvoiceRepo.create({
          tenant: rentacarTenant,
          reservation: savedReservations[0],
          integratorKey: 'mock',
          status: InvoiceStatus.SENT,
          vatRateUsed: 20,
          subtotal: 1000,
          vatAmount: 200,
          total: 1200,
          externalInvoiceId: 'INV-001',
          pdfUrl: '/invoices/inv-001.pdf',
        }));
      }
    }

    console.log('✅ Mock data seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding mock data:', error);
    process.exit(1);
  }
};

seedMockData();


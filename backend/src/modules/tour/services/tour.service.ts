import { In, Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Tour, DurationUnit } from '../entities/tour.entity';
import { TourFeature } from '../entities/tour-feature.entity';
import { Translation } from '../../shared/entities/translation.entity';
import { TourInfoItem } from '../entities/tour-info-item.entity';
import { TourImage } from '../entities/tour-image.entity';
import { TourTimeSlot } from '../entities/tour-time-slot.entity';
import { TourPricing, PricingType } from '../entities/tour-pricing.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TenantFeaturesService } from '../../shared/services/tenant-features.service';
import { ForbiddenError } from '../../../utils/errors';
import { Destination } from '../../shared/entities/destination.entity';
import { Language } from '../../shared/entities/language.entity';

// Helper function to create slug from title
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export type TourTranslationInput = {
  languageId: string;
  title: string;
  slug?: string;
  description?: string;
  includedServices?: string[];
  excludedServices?: string[];
};

export type TourInfoItemInput = {
  languageId: string;
  text: string;
  order?: number;
};

export type TourImageInput = {
  url: string;
  alt?: string;
  order?: number;
  isPrimary?: boolean;
};

export type TourTimeSlotInput = {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  order?: number;
};

export type TourPricingInput = {
  type: PricingType;
  price: number;
  currencyCode?: string;
  description?: string;
};

export type CreateTourInput = {
  tenantId: string;
  destinationId: string;
  slug: string;
  languageIds: string[];
  defaultLanguageId: string;
  translations: TourTranslationInput[];
  infoItems?: TourInfoItemInput[];
  images?: TourImageInput[];
  video?: string;
  days?: string[];
  duration?: number;
  durationUnit?: DurationUnit;
  timeSlots?: TourTimeSlotInput[];
  featureIds?: string[];
  pricing?: TourPricingInput[];
  maxCapacity?: number;
  currencyCode?: string;
  tags?: string[];
};

export type UpdateTourInput = Partial<Omit<CreateTourInput, 'tenantId'>>;

const MODEL_NAME = 'Tour';

export class TourService {
  private static tourRepo(): Repository<Tour> {
    return AppDataSource.getRepository(Tour);
  }

  private static translationRepo(): Repository<Translation> {
    return AppDataSource.getRepository(Translation);
  }

  static async createTour(input: CreateTourInput): Promise<Tour> {
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const destinationRepo = AppDataSource.getRepository(Destination);
    const languageRepo = AppDataSource.getRepository(Language);
    const infoItemRepo = AppDataSource.getRepository(TourInfoItem);
    const imageRepo = AppDataSource.getRepository(TourImage);
    const timeSlotRepo = AppDataSource.getRepository(TourTimeSlot);
    const pricingRepo = AppDataSource.getRepository(TourPricing);
    const featureRepo = AppDataSource.getRepository(TourFeature);

    // Validate tenant — tur modülü admin özellik bayrağı veya kategori ile açılabilir
    const tenant = await tenantRepo.findOne({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    const tourEnabled = await TenantFeaturesService.hasFeature(input.tenantId, 'tour');
    if (!tourEnabled) {
      throw new ForbiddenError('Tur modülü bu tenant için etkin değil. Yönetim panelinden açılmalıdır.');
    }

    // Validate destination
    const destination = await destinationRepo.findOne({ where: { id: input.destinationId } });
    if (!destination) {
      throw new Error('Destination not found');
    }

    // Validate languages exist
    const languages = await languageRepo.find({ where: { id: In(input.languageIds) } });
    if (languages.length !== input.languageIds.length) {
      throw new Error('One or more languages not found');
    }

    // Validate that all languages are active for the tenant
    const { TranslationValidator } = await import('../../shared/utils/translation-validator');
    await TranslationValidator.validateActiveLanguages(input.tenantId, input.languageIds);

    // Validate default language
    const defaultLanguage = await languageRepo.findOne({ where: { id: input.defaultLanguageId } });
    if (!defaultLanguage) {
      throw new Error('Default language not found');
    }
    if (!input.languageIds.includes(input.defaultLanguageId)) {
      throw new Error('Default language must be one of the selected languages');
    }

    // Validate translations match languages
    const translationLanguageIds = input.translations.map(t => t.languageId);
    if (!translationLanguageIds.every(id => input.languageIds.includes(id))) {
      throw new Error('All translation languageIds must be in selected languages');
    }

    // Get default translation for title (used as fallback)
    const defaultTranslation = input.translations.find(t => t.languageId === input.defaultLanguageId);
    if (!defaultTranslation) {
      throw new Error('Default language translation is required');
    }

    // Load features if provided
    let features: TourFeature[] = [];
    if (input.featureIds?.length) {
      features = await featureRepo.find({ where: { id: In(input.featureIds) } });
    }

    // Use default language slug or generate from title
    const defaultSlug = defaultTranslation.slug || slugify(defaultTranslation.title);

    // Create tour
    const tour = this.tourRepo().create({
      tenant,
      destination,
      slug: input.slug || defaultSlug, // Use provided slug or default language slug
      title: defaultTranslation.title, // Keep for backward compatibility
      duration: input.duration,
      durationUnit: input.durationUnit ?? DurationUnit.HOUR,
      maxCapacity: input.maxCapacity ?? 0,
      days: input.days,
      video: input.video,
      currencyCode: input.currencyCode ?? 'EUR',
      tags: input.tags,
      languages,
      defaultLanguage,
      defaultLanguageId: input.defaultLanguageId,
      features,
    });

    const savedTour = await this.tourRepo().save(tour);

    // Create translations using generic Translation entity
    const translations = input.translations.map(t => {
      // Combine description, includedServices, excludedServices into description field as JSON
      const translationData: any = {
        description: t.description || undefined,
      };
      if (t.includedServices) translationData.includedServices = t.includedServices;
      if (t.excludedServices) translationData.excludedServices = t.excludedServices;
      if (t.slug) translationData.slug = t.slug || slugify(t.title);

      return this.translationRepo().create({
        model: MODEL_NAME,
        modelId: savedTour.id,
        languageId: t.languageId,
        name: t.title,
        value: Object.keys(translationData).length > 0 ? JSON.stringify(translationData) : undefined,
      });
    });
    await this.translationRepo().save(translations);

    // Create info items
    if (input.infoItems?.length) {
        const infoItems = input.infoItems.map(item => {
          const infoItem = new TourInfoItem();
          infoItem.tourId = savedTour.id;
          infoItem.languageId = item.languageId;
          infoItem.text = item.text;
          infoItem.order = item.order ?? 0;
          return infoItem;
        });
      await infoItemRepo.save(infoItems);
    }

    // Create images
    if (input.images?.length) {
        const images = input.images.map((img, index) => {
          const image = new TourImage();
          image.tourId = savedTour.id;
          image.url = img.url;
          image.alt = img.alt;
          image.order = img.order ?? index;
          image.isPrimary = img.isPrimary ?? index === 0;
          return image;
        });
      await imageRepo.save(images);
    }

    // Create time slots
    if (input.timeSlots?.length) {
        const timeSlots = input.timeSlots.map((slot, index) => {
          const timeSlot = new TourTimeSlot();
          timeSlot.tourId = savedTour.id;
          timeSlot.startTime = slot.startTime;
          timeSlot.endTime = slot.endTime;
          timeSlot.order = slot.order ?? index;
          return timeSlot;
        });
      await timeSlotRepo.save(timeSlots);
    }

    // Create pricing
    if (input.pricing?.length) {
        const pricing = input.pricing.map(p => {
          const price = new TourPricing();
          price.tourId = savedTour.id;
          price.type = p.type;
          price.price = p.price;
          price.currencyCode = p.currencyCode ?? input.currencyCode ?? 'EUR';
          price.description = p.description;
          return price;
        });
      await pricingRepo.save(pricing);
    }

    // Reload with all relations
    return this.getTourById(savedTour.id) as Promise<Tour>;
  }

  static async listTours(tenantId: string): Promise<Tour[]> {
    const tours = await this.tourRepo().find({ 
      where: { tenantId }, 
      relations: [
        'destination',
        'languages',
        'defaultLanguage',
        'features',
        'features.translations',
        'features.translations.language',
        'infoItems',
        'infoItems.language',
        'images',
        'timeSlots',
        'pricing',
      ],
      order: { createdAt: 'DESC' },
    });

    // Fetch translations for all tours
    const tourIds = tours.map(t => t.id);
    const translations = tourIds.length > 0
      ? await this.translationRepo().find({
          where: {
            model: MODEL_NAME,
            modelId: In(tourIds),
          },
          relations: ['language'],
        })
      : [];

    // Attach translations to tours (Tour type doesn't have translations property, but we'll extend it)
    return tours.map(tour => ({
      ...tour,
      translations: translations.filter(t => t.modelId === tour.id),
    } as Tour & { translations: Translation[] }));
  }

  static async getTourById(id: string): Promise<Tour | null> {
    const tour = await this.tourRepo().findOne({
      where: { id },
      relations: [
        'destination',
        'languages',
        'defaultLanguage',
        'features',
        'features.translations',
        'features.translations.language',
        'infoItems',
        'infoItems.language',
        'images',
        'timeSlots',
        'pricing',
      ],
    });

    if (!tour) {
      return null;
    }

    // Fetch translations
    const translations = await this.translationRepo().find({
      where: {
        model: MODEL_NAME,
        modelId: id,
      },
      relations: ['language'],
    });

    return {
      ...tour,
      translations,
    } as Tour & { translations: Translation[] };
  }

  static async updateTour(id: string, input: UpdateTourInput): Promise<Tour> {
    const tour = await this.tourRepo().findOne({
      where: { id },
      relations: [
        'destination',
        'languages',
        'defaultLanguage',
        'features',
        'translations',
        'infoItems',
        'images',
        'timeSlots',
        'pricing',
      ],
    });

    if (!tour) {
      throw new Error('Tour not found');
    }

    const destinationRepo = AppDataSource.getRepository(Destination);
    const languageRepo = AppDataSource.getRepository(Language);
    const featureRepo = AppDataSource.getRepository(TourFeature);
    const infoItemRepo = AppDataSource.getRepository(TourInfoItem);
    const imageRepo = AppDataSource.getRepository(TourImage);
    const timeSlotRepo = AppDataSource.getRepository(TourTimeSlot);
    const pricingRepo = AppDataSource.getRepository(TourPricing);

    // Update destination if provided
    if (input.destinationId) {
      const destination = await destinationRepo.findOne({ where: { id: input.destinationId } });
      if (!destination) {
        throw new Error('Destination not found');
      }
      tour.destination = destination;
      tour.destinationId = input.destinationId;
    }

    // Update languages if provided
    if (input.languageIds !== undefined) {
      const languages = await languageRepo.find({ where: { id: In(input.languageIds) } });
      if (languages.length !== input.languageIds.length) {
        throw new Error('One or more languages not found');
      }
      tour.languages = languages;
    }

    // Update default language if provided
    if (input.defaultLanguageId !== undefined) {
      if (input.defaultLanguageId) {
        const defaultLanguage = await languageRepo.findOne({ where: { id: input.defaultLanguageId } });
        if (!defaultLanguage) {
          throw new Error('Default language not found');
        }
        if (input.languageIds && !input.languageIds.includes(input.defaultLanguageId)) {
          throw new Error('Default language must be one of the selected languages');
        }
        tour.defaultLanguage = defaultLanguage;
        tour.defaultLanguageId = input.defaultLanguageId;
      } else {
        tour.defaultLanguage = null;
        tour.defaultLanguageId = null;
      }
    }

    // Update features if provided
    if (input.featureIds !== undefined) {
      let features: TourFeature[] = [];
      if (input.featureIds.length > 0) {
        features = await featureRepo.find({ where: { id: In(input.featureIds) } });
      }
      tour.features = features;
    }

    // Update basic fields
    if (input.slug !== undefined) tour.slug = input.slug;
    if (input.duration !== undefined) tour.duration = input.duration;
    if (input.durationUnit !== undefined) tour.durationUnit = input.durationUnit;
    if (input.maxCapacity !== undefined) tour.maxCapacity = input.maxCapacity;
    if (input.days !== undefined) tour.days = input.days;
    if (input.video !== undefined) tour.video = input.video;
    if (input.currencyCode !== undefined) tour.currencyCode = input.currencyCode;
    if (input.tags !== undefined) tour.tags = input.tags;

    // Update title from default translation if provided
    if (input.translations && input.defaultLanguageId) {
      const defaultTranslation = input.translations.find(t => t.languageId === input.defaultLanguageId);
      if (defaultTranslation) {
        tour.title = defaultTranslation.title;
      }
    }

    const savedTour = await this.tourRepo().save(tour);

    // Update translations
    if (input.translations !== undefined) {
      // Delete existing translations
      await this.translationRepo().delete({
        model: MODEL_NAME,
        modelId: id,
      });

      // Create new translations using generic Translation entity
      const translations = input.translations.map(t => {
        // Combine description, includedServices, excludedServices into description field as JSON
        const translationData: any = {
          description: t.description || undefined,
        };
        if (t.includedServices) translationData.includedServices = t.includedServices;
        if (t.excludedServices) translationData.excludedServices = t.excludedServices;
        if (t.slug) translationData.slug = t.slug || slugify(t.title);

        return this.translationRepo().create({
          model: MODEL_NAME,
          modelId: id,
          languageId: t.languageId,
          name: t.title,
          value: Object.keys(translationData).length > 0 ? JSON.stringify(translationData) : undefined,
        });
      });
      await this.translationRepo().save(translations);
    }

    // Update info items
    if (input.infoItems !== undefined) {
      // Delete existing info items
      await infoItemRepo.delete({ tourId: id });

      // Create new info items
      if (input.infoItems.length > 0) {
        const infoItems = input.infoItems.map(item => {
          const infoItem = new TourInfoItem();
          infoItem.tourId = id;
          infoItem.languageId = item.languageId;
          infoItem.text = item.text;
          infoItem.order = item.order ?? 0;
          return infoItem;
        });
        await infoItemRepo.save(infoItems);
      }
    }

    // Update images
    if (input.images !== undefined) {
      // Delete existing images
      await imageRepo.delete({ tourId: id });

      // Create new images
      if (input.images.length > 0) {
        const images = input.images.map((img, index) => {
          const image = new TourImage();
          image.tourId = id;
          image.url = img.url;
          image.alt = img.alt;
          image.order = img.order ?? index;
          image.isPrimary = img.isPrimary ?? index === 0;
          return image;
        });
        await imageRepo.save(images);
      }
    }

    // Update time slots
    if (input.timeSlots !== undefined) {
      // Delete existing time slots
      await timeSlotRepo.delete({ tourId: id });

      // Create new time slots
      if (input.timeSlots.length > 0) {
        const timeSlots = input.timeSlots.map((slot, index) => {
          const timeSlot = new TourTimeSlot();
          timeSlot.tourId = id;
          timeSlot.startTime = slot.startTime;
          timeSlot.endTime = slot.endTime;
          timeSlot.order = slot.order ?? index;
          return timeSlot;
        });
        await timeSlotRepo.save(timeSlots);
      }
    }

    // Update pricing
    if (input.pricing !== undefined) {
      // Delete existing pricing
      await pricingRepo.delete({ tourId: id });

      // Create new pricing
      if (input.pricing.length > 0) {
        const pricing = input.pricing.map(p => {
          const price = new TourPricing();
          price.tourId = id;
          price.type = p.type;
          price.price = p.price;
          price.currencyCode = p.currencyCode ?? input.currencyCode ?? tour.currencyCode;
          price.description = p.description;
          return price;
        });
        await pricingRepo.save(pricing);
      }
    }

    // Reload with all relations
    return this.getTourById(id) as Promise<Tour>;
  }

  static async removeTour(id: string): Promise<void> {
    const tour = await this.tourRepo().findOne({ where: { id } });
    if (!tour) {
      throw new Error('Tour not found');
    }

    // Delete translations first
    await this.translationRepo().delete({
      model: MODEL_NAME,
      modelId: id,
    });

    await this.tourRepo().remove(tour);
  }
}

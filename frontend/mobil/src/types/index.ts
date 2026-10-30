export interface User {
  id: string;
  email: string;
  name: string;
  token?: string;
}

export interface Language {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rateToTry: string;
  isBaseCurrency: boolean;
  isActive: boolean;
  lastUpdatedAt: string;
  autoUpdate: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Country {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  name: string;
  code: string;
  phoneCode: string;
  flag?: string;
  isActive: boolean;
}

export interface Location {
  id: number;
  name: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface DestinationTranslation {
  id: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  modelId: string;
  languageId: string;
  name: string;
  value: string;
  slug?: string;
  language: Language;
}

export interface Destination {
  id: string;
  createdAt: string;
  updatedAt: string;
  image: string | null;
  isFeatured: boolean;
  isActive?: boolean;
  rentacarLocationId?: string | null;
  translations: DestinationTranslation[];
}

export interface Blog {
  id: number;
  image: string;
  view: number;
  created_at: string;
  updated_at: string;
  sort: number;
  site: number;
  id_blog: number;
  id_lang: number;
  title: string;
  short_description: string;
  description: string;
  slug: string;
  meta_title: string;
  image_alt: string;
  image_alt_title: string;
}

export interface DropLocation {
  id: string;
  locationId: string;
  deliveryLocationId: string;
  deliveryLocationName: string;
  distance: number;
  fee: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PickupLocation {
  id: number | string;
  locationId?: number | string; // API'den gelen locationId field'ı
  createdAt?: string;
  updatedAt?: string;
  tenantId?: string;
  title?: string;
  name?: string;
  metaTitle?: string;
  id_parent?: number | string | null;
  parentId?: number | string | null;
  parent?: PickupLocation | null;
  type?: string | 'hotel' | 'otel' | 'airport' | 'center' | 'merkez' | 'havalimani' | 'address' | null;
  country?: string;
  city?: string;
  sort?: number;
  address?: string;
  status?: number;
  price?: number;
  deliveryFee?: string;
  dropFee?: string;
  minDayCount?: number | null;
  isActive?: boolean;
  children?: PickupLocation[];
  drops?: DropLocation[];
  translations?: Array<{
    id: string;
    name: string;
    languageId: string;
  }>;
}

export interface CategoryTranslation {
  id: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  modelId: string;
  languageId: string;
  name: string;
  value: string;
  language: Language;
}

export interface Category {
  id: string;
  createdAt: string;
  updatedAt: string;
  image?: string;
  translations: CategoryTranslation[];
}

export interface CarCategory {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  pricePerDay: number;
}

export interface Extra {
  id: number;
  name: string;
  description: string;
  price: number;
  type: string;
}

export interface StaticData {
  currencies: Array<{
    id: number;
    code: string;
    symbol: string;
  }>;
  categories: CarCategory[];
  locations: Location[];
  terms: string;
  privacy: string;
}

export interface SearchParams {
  pickupLocation: number;
  dropoffLocation: number;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
}

// ============================================
// SaaS Location Management Types (Yeni Yapı)
// ============================================

/**
 * Genel locations tablosundaki lokasyon (SaaS seçimi için)
 */
export interface BaseLocation {
  id: number;
  name: string;
  parentId: number | null;
  type: string | null; // 'airport', 'hotel', 'center', 'address', etc.
  children?: BaseLocation[];
}

/**
 * SaaS'a lokasyon ekleme/güncelleme için payload
 */
export interface SaaSLocationPayload {
  locationId: number | string;
  sort?: number;
  address?: string;
  price?: number;
  deliveryFee?: string;
  dropFee?: string;
  minDayCount?: number;
  isActive?: boolean;
}

/**
 * SaaS lokasyon mapping response (rentacar_locations tablosu)
 */
export interface SaaSLocationMapping {
  id: number | string;
  locationId: number | string;
  tenantId: string;
  sort: number;
  address?: string;
  price?: number;
  deliveryFee?: string;
  dropFee?: string;
  minDayCount?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // JOIN ile gelen location bilgileri
  location?: BaseLocation;
}
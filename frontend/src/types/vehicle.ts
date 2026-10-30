export interface VehicleImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  order: number;
}

export interface VehicleCategory {
  id: string;
  name: string;
}

export interface VehicleBrand {
  id: string;
  name: string;
}

export interface VehicleModel {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string | number;
  name: string;
  category?: VehicleCategory | string;
  categoryName?: string;
  segment?: string;
  brand?: VehicleBrand;
  model?: VehicleModel;
  year?: number;
  fuelType?: 'gasoline' | 'diesel' | 'electric' | 'Benzin' | 'Dizel' | 'Elektrik' | 'Hibrit' | string;
  transmission?: 'manual' | 'automatic' | 'Manuel' | 'Otomatik' | string;
  seats?: number;
  luggage?: number;
  largeLuggage?: number;
  smallLuggage?: number;
  doors?: number;
  description?: string;
  images?: VehicleImage[];
  imageUrl?: string;
  image?: string;
  dailyPrice?: number;
  totalPrice?: number;
  rentalDays?: number;
  deliveryFee?: number;
  dropFee?: number;
  currencyCode?: string;
  payNowPrice?: number;
  payAtOfficePrice?: number;
  savings?: number;
  isPromotional?: boolean;
  features?: string[];
}

/** Query params for GET /rentacar/vehicles/search (server). */
export interface VehicleSearchParams {
  pickupLocationId: string | number;
  dropoffLocationId: string | number;
  pickupDate: string;
  dropoffDate: string;
  languageId: string;
  currencyId: string;
}

export interface VehicleFilter {
  segment?: string;
  vehicleType?: string;
  transmission?: string;
  fuelType?: string;
  sortBy?: string;
}


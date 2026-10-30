// Transfer Types

export interface TransferRoute {
  id: string;
  name: string;
  type: 'airport_hotel' | 'hotel_airport' | 'airport_location' | 'location_airport' | 'hotel_hotel' | 'location_location';
  distance: number;
  averageDuration: number;
  points: any[];
}

export interface TransferVehicle {
  id: string;
  name: string;
  type: 'sedan' | 'van' | 'minibus' | 'bus' | 'luxury';
  capacity: number;
  luggage: number;
  images: string[];
  description?: string;
  features?: string[];
}

export interface TransferPricing {
  basePrice: number;
  totalPrice: number;
  currencyCode: string;
  isNightRate: boolean;
  isRoundTrip: boolean;
  extraServicePrices?: Record<string, number>;
}

export interface Transfer {
  route: TransferRoute;
  vehicle: TransferVehicle;
  pricing: TransferPricing;
}

export interface TransferSearchParams {
  tenantId: string;
  languageId?: string;
  originType: 'airport' | 'hotel' | 'location';
  originId: string;
  destinationType: 'airport' | 'hotel' | 'location';
  destinationId: string;
  transferDate: string;
  transferTime?: string;
  passengerCount?: number;
  isRoundTrip?: boolean;
  currencyId?: string;
}

export interface TransferSearchResponse {
  transfers: Transfer[];
  searchParams: TransferSearchParams;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  nationality: string;
  identityNumber: string; // TC Kimlik or Passport
  dateOfBirth: string; // YYYY-MM-DD format
  phoneCountryCode: string; // +90, +49, etc.
  phoneNumber: string;
  email: string;
}

export interface DriverLicenseInfo {
  licenseNumber: string;
  licenseIssueDate: string; // YYYY-MM-DD
  licenseExpiryDate: string; // YYYY-MM-DD
  licenseCountry: string;
}

export interface AddressInfo {
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface PaymentInfo {
  cardNumber: string; // Masked or encrypted
  cardHolderName: string;
  expiryMonth: string; // MM
  expiryYear: string; // YYYY
  cvv: string; // Should be handled securely
  cardType?: string; // visa, mastercard, etc.
}

export interface LocationDetails {
  flightNumber?: string; // For airport locations
  flightDescription?: string; // For airport locations
  hotelName?: string; // For hotel locations
  address?: string; // For address locations
}

export type PaymentMethod = 'cash' | 'card_at_office' | 'online';

export interface ReservationRequest {
  // Vehicle and rental info
  vehicleId: string;
  pickupLocationId: string;
  dropoffLocationId: string;
  pickupDate: string; // YYYY-MM-DD
  dropoffDate: string; // YYYY-MM-DD
  pickupTime: string; // HH:mm
  dropoffTime: string; // HH:mm
  rentalDays: number;
  
  // Selected extras
  extras: Array<{
    id: string;
    quantity?: number;
  }>;
  
  // Pricing
  vehiclePrice: number;
  extrasPrice: number;
  totalPrice: number;
  currencyCode: string;
  
  // Customer information
  personalInfo: PersonalInfo;
  driverLicenseInfo: DriverLicenseInfo;
  addressInfo: AddressInfo;
  paymentInfo?: PaymentInfo; // Optional - only required for online payment
  
  // Agreements
  personalDataConsent: boolean;
  commercialElectronicConsent: boolean;
  rentalConditionsConsent: boolean;
  
  // Additional info
  promoCode?: string;
  specialRequests?: string;
  
  // Payment method
  paymentMethod: PaymentMethod;
  
  // Location Details (Alış / Dönüş Detayları)
  pickupDetails?: LocationDetails;
  dropoffDetails?: LocationDetails;
}


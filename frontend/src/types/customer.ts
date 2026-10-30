export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  mobilePhone: string;
  homePhone?: string | null;
  country: string;
  birthDate?: string | null;
  gender?: string | null;
  languageId: string;
  homeAddress?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  licenseNumber?: string | null;
  licenseClass?: string | null;
  isActive: boolean;
  tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  category?: string;
}

export interface Wallet {
  id: string;
  balance: number;
  currencyCode: string;
  totalEarned: number;
  totalSpent: number;
}

export interface CustomerProfile {
  customer: Customer;
  tenant: Tenant;
  wallet?: Wallet;
}

export interface CustomerLoginRequest {
  email?: string;
  idNumber?: string;
  password: string;
  tenantId?: string;
}

export interface CustomerLoginResponse {
  success: boolean;
  data: {
    token: string;
    customer: Customer;
    tenant: Tenant;
  };
}

export interface CustomerReservation {
  id: string;
  reference: string;
  type: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkIn: string;
  checkOut: string;
  customerLanguage: {
    id: string;
    name: string;
    code: string;
  };
  metadata: {
    vehicleId?: string;
    pickupLocationId?: string;
    returnLocationId?: string;
    totalPrice: number;
    currencyCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}


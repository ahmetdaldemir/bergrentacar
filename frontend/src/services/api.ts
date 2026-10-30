import { API_BASE_URL, getTenantId } from '@/config/api';
import { buildLegacySettingsFromTenantRecord, parseTenantApiResponse, type TenantRecord } from '@/types/tenant';

interface LoginCredentials {
  email: string;
  password: string;
}

/** Normalize vehicle-categories API body to a list (avoids .map on non-arrays after 401/error bodies). */
function normalizeVehicleCategoriesListPayload(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data;
  if (Array.isArray(o.items)) return o.items;
  if (Array.isArray(o.categories)) return o.categories;
  const nested = o.data;
  if (nested && typeof nested === 'object' && Array.isArray((nested as { items?: unknown[] }).items)) {
    return (nested as { items: unknown[] }).items;
  }
  return [];
}

export const api = {
  /** Public tenant profile (no auth/login). */
  getTenant: async (tenantIdParam?: string): Promise<TenantRecord> => {
    const tenantId = tenantIdParam ?? getTenantId();
    const response = await fetch(`${API_BASE_URL}/tenants?tenantId=${tenantId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    return parseTenantApiResponse(json);
  },

  /** Persist shape expected by getStaticData / Header / Footer (tenant + settings.site from API settings). */
  buildTenantSettingsPayload: (tenant: TenantRecord) => ({
    tenant,
    settings: buildLegacySettingsFromTenantRecord(tenant),
  }),

  // Login API (legacy)
  login: async (credentials: LoginCredentials) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return response.json();
  },

  // Get static data (site information)
  getStaticData: async () => {
    const tenantSettings = localStorage.getItem('tenantSettings');
    if (!tenantSettings) {
      throw new Error('Tenant settings not found');
    }
    return JSON.parse(tenantSettings) as {
      tenant: TenantRecord;
      settings: ReturnType<typeof buildLegacySettingsFromTenantRecord>;
    } 
  },

  // Get drop locations
  getDropLocations: async (langId: number = 1, id: number = 34) => {
    const response = await fetch(`${API_BASE_URL}/droplocation?langId=${langId}&id=${id}`);
    return response.json();
  },

  // Get languages
  getLanguages: async () => {
    const tenantId = getTenantId();
    const response = await fetch(`${API_BASE_URL}/languages?tenantId=${tenantId}`);
    return response.json();
  },

  // Get currencies
  getCurrencies: async () => {
    const response = await fetch(`${API_BASE_URL}/currencies`);
    return response.json();
  },

  // Get countries
  getCountries: async () => {
    const response = await fetch(`${API_BASE_URL}/countries`);
    return response.json();
  },

  // Get extras
  getExtras: async (language: number = 1) => {
    const response = await fetch(`${API_BASE_URL}/getEkstra?language=${language}`);
    return response.json();
  },

  // Get destinations
  getDestinations: async (languageId: string) => {
    try {
      const tenantId = getTenantId();

      const response = await fetch(`${API_BASE_URL}/destinations?tenantId=${tenantId}&languageId=${languageId}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // If 404 or other error, return empty array instead of throwing
        if (response.status === 404) {
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch destinations: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    } catch (error: any) {
      // Handle CORS and network errors gracefully
      if (process.env.NODE_ENV === 'development') {
        if (error?.name === 'TypeError' && error?.message?.includes('Failed to fetch')) {
          console.warn('CORS or network error fetching destinations. This is likely a backend CORS configuration issue.');
        } else {
          console.warn('Error fetching destinations:', error);
        }
      }
      // Return empty array on error to prevent app crashes
      return { success: true, data: [] };
    }
  },


  getCategories: async (languageId: string) => {
    const tenantId = getTenantId();

    try {
      const response = await fetch(
        `${API_BASE_URL}/rentacar/vehicle-categories?tenantId=${tenantId}&languageId=${languageId}`,
        {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `vehicle-categories ${response.status} ${response.statusText} — using empty list`
          );
        }
        return { success: true, data: [] };
      }

      const body = await response.json();
      const data = normalizeVehicleCategoriesListPayload(body);
      return { success: true, data };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error fetching categories:', error);
      }
      return { success: true, data: [] };
    }
  },

  // Get blog
  getBlog: async (languageId: string) => {
    try {
      const token = localStorage.getItem('token');
      const tenantId = getTenantId();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/blogs?tenantId=${tenantId}&languageId=${languageId}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers,
      });
      
      if (!response.ok) {
        // If 404 or other error, return empty array instead of throwing
        if (response.status === 404) {
          return { success: true, data: [] };
        }
        throw new Error(`Failed to fetch blog: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    } catch (error: any) {
      // Handle CORS and network errors gracefully
      if (process.env.NODE_ENV === 'development') {
        if (error?.name === 'TypeError' && error?.message?.includes('Failed to fetch')) {
          console.warn('CORS or network error fetching blog. This is likely a backend CORS configuration issue.');
        } else {
          console.warn('Error fetching blog:', error);
        }
      }
      // Return empty array on error to prevent app crashes
      return { success: true, data: [] };
    }
  },

  // Get pickup locations
  getPickupLocations: async () => {
    const token = localStorage.getItem('token');
    const tenantId = getTenantId();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/rentacar/locations?isActive=true&tenantId=${tenantId}`, {
      headers,
    });
    return response.json();
  },

  // Get drop-off locations based on pickup location's parent ID
  getDropoffLocations: async (languageId: string, parentLocationId: string | number) => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Convert to string for URL parameter (handles both UUID strings and numbers)
    const locationIdParam = String(parentLocationId);
    
    const response = await fetch(`${API_BASE_URL}/droplocation?languageId=${languageId}&id=${locationIdParam}`, {
      headers,
    });
    return response.json();
  },

  // ============================================
  // SaaS Location Management APIs (Yeni Yapı)
  // ============================================

  // Get all available locations from general locations table (for SaaS selection)
  getAllLocations: async () => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/locations/all`, {
      headers,
    });
    return response.json();
  },

  // Add location to SaaS (create mapping in rentacar_locations)
  addLocationToSaaS: async (locationData: {
    locationId: number | string;
    sort?: number;
    address?: string;
    price?: number;
    deliveryFee?: string;
    dropFee?: string;
    minDayCount?: number;
    isActive?: boolean;
  }) => {
    const token = localStorage.getItem('token');
    const tenantId = getTenantId();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/rentacar/locations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...locationData,
        tenantId,
      }),
    });
    return response.json();
  },

  // Update SaaS location mapping
  updateSaaSLocation: async (
    rentacarLocationId: number | string,
    locationData: {
      sort?: number;
      address?: string;
      price?: number;
      deliveryFee?: string;
      dropFee?: string;
      minDayCount?: number;
      isActive?: boolean;
    }
  ) => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/rentacar/locations/${rentacarLocationId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(locationData),
    });
    return response.json();
  },

  // Remove location from SaaS (soft delete - set isActive to false)
  removeLocationFromSaaS: async (rentacarLocationId: number | string) => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/rentacar/locations/${rentacarLocationId}`, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  },

  // Search vehicles — GET /rentacar/vehicles/search (only these query params)
  searchVehicles: async (searchParams: {
    pickupLocationId: string | number;
    dropoffLocationId: string | number;
    pickupDate: string;
    dropoffDate: string;
    languageId: string;
    currencyId: string;
  }) => {
    const token =
      localStorage.getItem('token') || localStorage.getItem('customerToken');
    const tenantId = getTenantId();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const params = new URLSearchParams();
    params.append('tenantId', tenantId);
    params.append('pickupLocationId', String(searchParams.pickupLocationId));
    params.append('dropoffLocationId', String(searchParams.dropoffLocationId));
    params.append('pickupDate', searchParams.pickupDate);
    params.append('dropoffDate', searchParams.dropoffDate);
    params.append('languageId', searchParams.languageId);
    params.append('currencyId', searchParams.currencyId);

    const response = await fetch(`${API_BASE_URL}/rentacar/vehicles/search?${params.toString()}`, {
      headers,
    });
    return response.json();
  },

  // Send email
  sendEmail: async (emailData: {
    to: string;
    subject: string;
    html: string;
  }) => {
    const token = localStorage.getItem('token');
    const tenantId = getTenantId();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/mail/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tenantId,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to send email' }));
      throw new Error(errorData.message || 'Failed to send email');
    }

    return response.json();
  },

  // Confirm reservation
  confirmReservation: async (reservationData: any) => {
    const token = localStorage.getItem('token');
    const tenantId = getTenantId();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/rentacar/reservations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tenantId,
        ...reservationData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to confirm reservation' }));
      throw new Error(errorData.message || 'Failed to confirm reservation');
    }

    return response.json();
  },

  // Get transfer locations
  getTransferLocations: async () => {
    const token = localStorage.getItem('token');
    const tenantId = getTenantId();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/transfer/public/locations?tenantId=${tenantId}`, {
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch transfer locations' }));
      throw new Error(errorData.message || 'Failed to fetch transfer locations');
    }

    return response.json();
  },

  // Transfer search
  searchTransfers: async (searchParams: {
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
  }) => {
    const token = localStorage.getItem('token');
    const tenantId = getTenantId();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append('tenantId', tenantId);
    params.append('originType', searchParams.originType);
    params.append('originId', searchParams.originId);
    params.append('destinationType', searchParams.destinationType);
    params.append('destinationId', searchParams.destinationId);
    params.append('transferDate', searchParams.transferDate);
    
    // Optional parameters with defaults
    if (searchParams.transferTime) {
      params.append('transferTime', searchParams.transferTime);
    } else {
      params.append('transferTime', '10:00');
    }
    
    if (searchParams.passengerCount) {
      params.append('passengerCount', String(searchParams.passengerCount));
    } else {
      params.append('passengerCount', '1');
    }
    
    if (searchParams.isRoundTrip !== undefined) {
      params.append('isRoundTrip', String(searchParams.isRoundTrip));
    } else {
      params.append('isRoundTrip', 'false');
    }
    
    if (searchParams.languageId) {
      params.append('languageId', searchParams.languageId);
    }
    
    if (searchParams.currencyId) {
      params.append('currencyId', searchParams.currencyId);
    }

    const response = await fetch(`${API_BASE_URL}/transfer/public/search?${params.toString()}`, {
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to search transfers' }));
      throw new Error(errorData.message || 'Failed to search transfers');
    }

    return response.json();
  },
};
/**
 * Central API Routes Registry
 * 
 * This file contains all API endpoint paths in a centralized location.
 * When adding new endpoints, update this file to maintain consistency
 * across backend and frontend.
 */

export const API_ROUTES = {
  // Health
  health: '/health',

  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
  },

  // Customer Auth
  customerAuth: {
    login: '/customers/auth/login',
    forgotPassword: '/customers/auth/forgot-password',
    resetPassword: '/customers/auth/reset-password',
    me: '/customers/auth/me',
    reservations: '/customers/auth/reservations',
    changePassword: '/customers/auth/change-password',
    logout: '/customers/auth/logout',
  },

  // Tenants
  tenants: {
    list: '/tenants',
    getById: (id: string) => `/tenants/${id}`,
    create: '/tenants',
    update: (id: string) => `/tenants/${id}`,
    delete: (id: string) => `/tenants/${id}`,
  },

  // Tenant Users
  tenantUsers: {
    list: '/tenant-users',
    getById: (id: string) => `/tenant-users/${id}`,
    create: '/tenant-users',
    update: (id: string) => `/tenant-users/${id}`,
    delete: (id: string) => `/tenant-users/${id}`,
  },

  // Languages
  languages: {
    list: '/languages',
    getById: (id: string) => `/languages/${id}`,
  },

  // Countries
  countries: {
    list: '/countries',
    getById: (id: string) => `/countries/${id}`,
    create: '/countries',
    update: (id: string) => `/countries/${id}`,
    delete: (id: string) => `/countries/${id}`,
    toggleActive: (id: string) => `/countries/${id}/toggle-active`,
    sync: '/countries/sync',
  },

  // Currencies
  currencies: {
    list: '/currencies',
    getById: (id: string) => `/currencies/${id}`,
  },

  // Master Locations
  masterLocations: {
    list: '/master-locations',
    getById: (id: string) => `/master-locations/${id}`,
    create: '/master-locations',
    update: (id: string) => `/master-locations/${id}`,
    delete: (id: string) => `/master-locations/${id}`,
  },

  // Rentacar
  rentacar: {
    vehicles: {
      list: '/rentacar/vehicles',
      getById: (id: string) => `/rentacar/vehicles/${id}`,
      create: '/rentacar/vehicles',
      update: (id: string) => `/rentacar/vehicles/${id}`,
      delete: (id: string) => `/rentacar/vehicles/${id}`,
      search: '/rentacar/vehicles/search',
      /** Bugün + N gün, totalPrice artan; tenant + lokasyon gerekir */
      promoVehicles: '/rentacar/public/promo-vehicles',
      /** Tenant tüm araç 7g fiyat; yalnızca tenantId veya lokasyon çifti */
      tenantWeeklyPrices: '/rentacar/public/tenant-weekly-prices',
      uploadImage: (vehicleId: string) => `/rentacar/vehicles/${vehicleId}/images`,
      listImages: (vehicleId: string) => `/rentacar/vehicles/${vehicleId}/images`,
      updateImage: (vehicleId: string, imageId: string) => `/rentacar/vehicles/${vehicleId}/images/${imageId}`,
      deleteImage: (vehicleId: string, imageId: string) => `/rentacar/vehicles/${vehicleId}/images/${imageId}`,
      reorderImages: (vehicleId: string) => `/rentacar/vehicles/${vehicleId}/images/reorder`,
    },
    locations: {
      list: '/rentacar/locations',
      getById: (id: string) => `/rentacar/locations/${id}`,
      create: '/rentacar/locations',
      update: (id: string) => `/rentacar/locations/${id}`,
      delete: (id: string) => `/rentacar/locations/${id}`,
    },
    locationPricing: {
      list: '/rentacar/location-pricing',
      bulkCopy: '/rentacar/location-pricing/bulk-copy',
    },
    vehicleCategories: {
      list: '/rentacar/vehicle-categories',
      getById: (id: string) => `/rentacar/vehicle-categories/${id}`,
      create: '/rentacar/vehicle-categories',
      update: (id: string) => `/rentacar/vehicle-categories/${id}`,
      delete: (id: string) => `/rentacar/vehicle-categories/${id}`,
    },
    vehicleBrands: {
      list: '/rentacar/vehicle-brands',
      getById: (id: string) => `/rentacar/vehicle-brands/${id}`,
      create: '/rentacar/vehicle-brands',
      update: (id: string) => `/rentacar/vehicle-brands/${id}`,
      delete: (id: string) => `/rentacar/vehicle-brands/${id}`,
    },
    vehicleModels: {
      list: '/rentacar/vehicle-models',
      getById: (id: string) => `/rentacar/vehicle-models/${id}`,
      create: '/rentacar/vehicle-models',
      update: (id: string) => `/rentacar/vehicle-models/${id}`,
      delete: (id: string) => `/rentacar/vehicle-models/${id}`,
    },
    extras: {
      list: '/rentacar/extras',
      getById: (id: string) => `/rentacar/extras/${id}`,
      create: '/rentacar/extras',
      update: (id: string) => `/rentacar/extras/${id}`,
      delete: (id: string) => `/rentacar/extras/${id}`,
    },
    reservations: {
      create: '/rentacar/reservations',
      list: '/rentacar/reservations',
      getById: (id: string) => `/rentacar/reservations/${id}`,
    },
  },

  // Finance
  finance: {
    categories: {
      list: '/finance/categories',
      getById: (id: string) => `/finance/categories/${id}`,
      create: '/finance/categories',
      update: (id: string) => `/finance/categories/${id}`,
      delete: (id: string) => `/finance/categories/${id}`,
    },
    cari: {
      list: '/finance/cari',
      getById: (id: string) => `/finance/cari/${id}`,
      create: '/finance/cari',
      update: (id: string) => `/finance/cari/${id}`,
      delete: (id: string) => `/finance/cari/${id}`,
    },
    transactions: {
      list: '/finance/transactions',
      getById: (id: string) => `/finance/transactions/${id}`,
      create: '/finance/transactions',
      update: (id: string) => `/finance/transactions/${id}`,
      delete: (id: string) => `/finance/transactions/${id}`,
    },
    checks: {
      list: '/finance/checks',
      getById: (id: string) => `/finance/checks/${id}`,
      create: '/finance/checks',
      update: (id: string) => `/finance/checks/${id}`,
      markStatus: (id: string) => `/finance/checks/${id}/mark`,
      delete: (id: string) => `/finance/checks/${id}`,
    },
    loans: {
      list: '/finance/loans',
      getById: (id: string) => `/finance/loans/${id}`,
      create: '/finance/loans',
      update: (id: string) => `/finance/loans/${id}`,
      close: (id: string) => `/finance/loans/${id}/close`,
      regenerateInstallments: (id: string) => `/finance/loans/${id}/regenerate-installments`,
      delete: (id: string) => `/finance/loans/${id}`,
    },
    loanInstallments: {
      list: '/finance/loan-installments',
      getById: (id: string) => `/finance/loan-installments/${id}`,
      pay: (id: string) => `/finance/loan-installments/${id}/pay`,
      cancel: (id: string) => `/finance/loan-installments/${id}/cancel`,
    },
    reports: {
      summary: '/finance/reports/summary',
    },
  },

  // Operations (Ops)
  ops: {
    tasks: {
      list: '/ops/tasks',
      getById: (id: string) => `/ops/tasks/${id}`,
      create: '/ops/tasks',
      update: (id: string) => `/ops/tasks/${id}`,
      updateMedia: (id: string) => `/ops/tasks/${id}/media`,
      verifyDocs: (id: string) => `/ops/tasks/${id}/verify-docs`,
      finalize: (id: string) => `/ops/tasks/${id}/finalize`,
      finalizeReturn: (id: string) => `/ops/tasks/${id}/return/finalize`,
      print: (id: string) => `/ops/tasks/${id}/print`,
    },
  },

  // Settings
  settings: {
    get: '/settings',
    update: '/settings',
    upload: '/settings/upload',
  },

  // Customers (CRM)
  customers: {
    list: '/crm/customers',
    getById: (id: string) => `/crm/customers/${id}`,
    create: '/crm/customers',
    update: (id: string) => `/crm/customers/${id}`,
    delete: (id: string) => `/crm/customers/${id}`,
  },

  // Reservations
  reservations: {
    list: '/reservations',
    getById: (id: string) => `/reservations/${id}`,
    create: '/reservations',
    update: (id: string) => `/reservations/${id}`,
    delete: (id: string) => `/reservations/${id}`,
  },

  // Reservation Logs
  reservationLogs: {
    list: '/reservation-logs',
    getById: (id: string) => `/reservation-logs/${id}`,
    convertToReservation: (id: string) => `/reservation-logs/${id}/convert`,
  },

  // Mail
  mail: {
    send: '/mail/send',
    sendBulk: '/mail/send-bulk',
  },

  // Chat
  chat: {
    widget: {
      send: '/chat/widget/send',
    },
    messages: {
      list: '/chat/messages',
      send: '/chat/messages',
    },
  },
} as const;

/**
 * Type helper for API routes
 */
export type ApiRoute = typeof API_ROUTES;


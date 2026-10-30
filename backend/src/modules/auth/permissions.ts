import { TenantUserRole } from '../tenants/entities/tenant-user.entity';

/**
 * Permission definitions for different operations
 * Each permission defines which roles can perform the operation
 */
export enum Permission {
  // User Management
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Languages
  LANGUAGE_VIEW = 'language:view',
  LANGUAGE_CREATE = 'language:create',
  LANGUAGE_UPDATE = 'language:update',
  LANGUAGE_DELETE = 'language:delete',

  // Destinations
  DESTINATION_VIEW = 'destination:view',
  DESTINATION_CREATE = 'destination:create',
  DESTINATION_UPDATE = 'destination:update',
  DESTINATION_DELETE = 'destination:delete',

  // Hotels
  HOTEL_VIEW = 'hotel:view',
  HOTEL_CREATE = 'hotel:create',
  HOTEL_UPDATE = 'hotel:update',
  HOTEL_DELETE = 'hotel:delete',

  // Blogs
  BLOG_VIEW = 'blog:view',
  BLOG_CREATE = 'blog:create',
  BLOG_UPDATE = 'blog:update',
  BLOG_DELETE = 'blog:delete',

  // Pages
  PAGE_VIEW = 'page:view',
  PAGE_CREATE = 'page:create',
  PAGE_UPDATE = 'page:update',
  PAGE_DELETE = 'page:delete',

  // Tours (tour category)
  TOUR_VIEW = 'tour:view',
  TOUR_CREATE = 'tour:create',
  TOUR_UPDATE = 'tour:update',
  TOUR_DELETE = 'tour:delete',

  // Rent A Car
  VEHICLE_VIEW = 'vehicle:view',
  VEHICLE_CREATE = 'vehicle:create',
  VEHICLE_UPDATE = 'vehicle:update',
  VEHICLE_DELETE = 'vehicle:delete',
  LOCATION_VIEW = 'location:view',
  LOCATION_CREATE = 'location:create',
  LOCATION_UPDATE = 'location:update',
  LOCATION_DELETE = 'location:delete',
  EXTRA_VIEW = 'extra:view',
  EXTRA_CREATE = 'extra:create',
  EXTRA_UPDATE = 'extra:update',
  EXTRA_DELETE = 'extra:delete',

  // Customers
  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_UPDATE = 'customer:update',
  CUSTOMER_DELETE = 'customer:delete',

  // Reservations
  RESERVATION_VIEW = 'reservation:view',
  RESERVATION_CREATE = 'reservation:create',
  RESERVATION_UPDATE = 'reservation:update',
  RESERVATION_DELETE = 'reservation:delete',

  // CRM
  CRM_VIEW = 'crm:view',
  CRM_CREATE = 'crm:create',
  CRM_UPDATE = 'crm:update',
  CRM_DELETE = 'crm:delete',

  // Transfer
  TRANSFER_VIEW = 'transfer:view',
  TRANSFER_CREATE = 'transfer:create',
  TRANSFER_UPDATE = 'transfer:update',
  TRANSFER_DELETE = 'transfer:delete',

  // Discount codes (global, transfer/rentacar vb. için tek tip)
  DISCOUNT_CODE_VIEW = 'discount_code:view',
  DISCOUNT_CODE_CREATE = 'discount_code:create',
  DISCOUNT_CODE_UPDATE = 'discount_code:update',
  DISCOUNT_CODE_DELETE = 'discount_code:delete',

  // Chat
  CHAT_VIEW = 'chat:view',
  CHAT_MANAGE = 'chat:manage',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_UPDATE = 'settings:update',

  // Email Templates
  EMAIL_TEMPLATE_VIEW = 'email_template:view',
  EMAIL_TEMPLATE_CREATE = 'email_template:create',
  EMAIL_TEMPLATE_UPDATE = 'email_template:update',
  EMAIL_TEMPLATE_DELETE = 'email_template:delete',

  // Surveys
  SURVEY_VIEW = 'survey:view',
  SURVEY_CREATE = 'survey:create',
  SURVEY_UPDATE = 'survey:update',
  SURVEY_DELETE = 'survey:delete',

  // Admin Dashboard
  ADMIN_VIEW = 'admin:view',

  // Finance
  FINANCE_VIEW = 'finance:view',
  FINANCE_CREATE = 'finance:create',
  FINANCE_UPDATE = 'finance:update',
  FINANCE_DELETE = 'finance:delete',

  // Hotel Sales Module
  HOTEL_SALES_VIEW = 'hotel_sales:view',
  HOTEL_SALES_CREATE = 'hotel_sales:create',
  HOTEL_SALES_UPDATE = 'hotel_sales:update',
  HOTEL_SALES_DELETE = 'hotel_sales:delete',

  // Flight (air ticket) Sales Module
  FLIGHT_SALES_VIEW = 'flight_sales:view',
  FLIGHT_SALES_CREATE = 'flight_sales:create',
  FLIGHT_SALES_UPDATE = 'flight_sales:update',
  FLIGHT_SALES_DELETE = 'flight_sales:delete',

  // Tenant Management
  TENANT_VIEW = 'tenant:view',
  TENANT_MANAGE = 'tenant:manage',
}

/**
 * Role-based permission mapping
 * Defines which roles have access to which permissions
 */
export const ROLE_PERMISSIONS: Record<TenantUserRole, Permission[]> = {
  [TenantUserRole.ADMIN]: [
    // Admin has all permissions
    ...Object.values(Permission),
  ],
  [TenantUserRole.EDITOR]: [
    // View permissions
    Permission.USER_VIEW,
    Permission.LANGUAGE_VIEW,
    Permission.DESTINATION_VIEW,
    Permission.HOTEL_VIEW,
    Permission.BLOG_VIEW,
    Permission.PAGE_VIEW,
    Permission.TOUR_VIEW,
    Permission.VEHICLE_VIEW,
    Permission.LOCATION_VIEW,
    Permission.EXTRA_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.RESERVATION_VIEW,
    Permission.CRM_VIEW,
    Permission.TRANSFER_VIEW,
    Permission.DISCOUNT_CODE_VIEW,
    Permission.CHAT_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.EMAIL_TEMPLATE_VIEW,
    Permission.SURVEY_VIEW,
    Permission.ADMIN_VIEW,
    Permission.FINANCE_VIEW,
    Permission.TENANT_VIEW,
    Permission.TENANT_MANAGE,
    Permission.HOTEL_SALES_VIEW,
    Permission.HOTEL_SALES_CREATE,
    Permission.HOTEL_SALES_UPDATE,
    Permission.FLIGHT_SALES_VIEW,
    Permission.FLIGHT_SALES_CREATE,
    Permission.FLIGHT_SALES_UPDATE,

    // Create permissions
    Permission.DESTINATION_CREATE,
    Permission.HOTEL_CREATE,
    Permission.BLOG_CREATE,
    Permission.PAGE_CREATE,
    Permission.TOUR_CREATE,
    Permission.VEHICLE_CREATE,
    Permission.LOCATION_CREATE,
    Permission.EXTRA_CREATE,
    Permission.CUSTOMER_CREATE,
    Permission.RESERVATION_CREATE,
    Permission.CRM_CREATE,
    Permission.TRANSFER_CREATE,
    Permission.DISCOUNT_CODE_CREATE,
    Permission.EMAIL_TEMPLATE_CREATE,
    Permission.SURVEY_CREATE,
    Permission.FINANCE_CREATE,

    // Update permissions
    Permission.DESTINATION_UPDATE,
    Permission.HOTEL_UPDATE,
    Permission.BLOG_UPDATE,
    Permission.PAGE_UPDATE,
    Permission.TOUR_UPDATE,
    Permission.VEHICLE_UPDATE,
    Permission.LOCATION_UPDATE,
    Permission.EXTRA_UPDATE,
    Permission.CUSTOMER_UPDATE,
    Permission.RESERVATION_UPDATE,
    Permission.RESERVATION_DELETE,
    Permission.CRM_UPDATE,
    Permission.TRANSFER_UPDATE,
    Permission.DISCOUNT_CODE_UPDATE,
    Permission.EMAIL_TEMPLATE_UPDATE,
    Permission.SURVEY_UPDATE,
    Permission.FINANCE_UPDATE,
  ],
  [TenantUserRole.VIEWER]: [
    // Viewer can only view
    Permission.USER_VIEW,
    Permission.LANGUAGE_VIEW,
    Permission.DESTINATION_VIEW,
    Permission.HOTEL_VIEW,
    Permission.HOTEL_SALES_VIEW,
    Permission.FLIGHT_SALES_VIEW,
    Permission.BLOG_VIEW,
    Permission.PAGE_VIEW,
    Permission.TOUR_VIEW,
    Permission.VEHICLE_VIEW,
    Permission.LOCATION_VIEW,
    Permission.EXTRA_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.RESERVATION_VIEW,
    Permission.CRM_VIEW,
    Permission.TRANSFER_VIEW,
    Permission.DISCOUNT_CODE_VIEW,
    Permission.CHAT_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.EMAIL_TEMPLATE_VIEW,
    Permission.SURVEY_VIEW,
    Permission.ADMIN_VIEW,
    Permission.FINANCE_VIEW,
    Permission.TENANT_VIEW,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: TenantUserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: TenantUserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: TenantUserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}


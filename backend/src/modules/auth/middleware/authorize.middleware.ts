import { NextFunction, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TenantUser, TenantUserRole } from '../../tenants/entities/tenant-user.entity';
import { AdminUser } from '../../admin/entities/admin-user.entity';
import { AuthenticatedRequest } from './auth.middleware';
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '../permissions';
import { ForbiddenError } from '../../../utils/errors';

/**
 * Admin JWT uses AdminUser.id as `sub` and must not hit TenantUser lookup.
 * Prefer `type === 'admin'`; if missing (legacy tokens), resolve via AdminUser when
 * the payload has no tenant session (`tenantId` is how tenant panel JWTs are shaped).
 */
async function isAdminRequest(authPayload: any): Promise<boolean> {
  if (!authPayload || typeof authPayload !== 'object') return false;
  if (authPayload.type === 'admin') return true;
  // Tenant panel JWT always includes tenantId (AuthService.createToken)
  if (typeof authPayload.tenantId === 'string' && authPayload.tenantId.length > 0) {
    return false;
  }
  if (!authPayload.sub) return false;
  const adminRepo: Repository<AdminUser> = AppDataSource.getRepository(AdminUser);
  const adminUser = await adminRepo.findOne({ where: { id: authPayload.sub } });
  return !!adminUser;
}

/**
 * Authorization middleware factory
 * Creates middleware that checks if the authenticated user has the required permission(s)
 */
export function authorize(permission: Permission): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export function authorize(permissions: Permission[], mode?: 'any' | 'all'): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export function authorize(
  permissionOrPermissions: Permission | Permission[],
  mode: 'any' | 'all' = 'any'
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void> {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        throw new ForbiddenError('Authentication required');
      }

      const authPayload = req.auth as any;
      const isAdmin = await isAdminRequest(authPayload);

      if (isAdmin) {
        // Admin users have all permissions
        // Token validation (JWT signature) already happened in authenticate middleware
        next();
        return;
      }

      // Get tenant user from database to get current role
      const userRepo: Repository<TenantUser> = AppDataSource.getRepository(TenantUser);
      const user = await userRepo.findOne({
        where: { id: req.auth.sub },
      });

      if (!user) {
        throw new ForbiddenError('User not found');
      }

      // Check permissions
      const permissions = Array.isArray(permissionOrPermissions) 
        ? permissionOrPermissions 
        : [permissionOrPermissions];
      
      const hasAccess = mode === 'all'
        ? hasAllPermissions(user.role, permissions)
        : hasAnyPermission(user.role, permissions);

      if (!hasAccess) {
        throw new ForbiddenError(`Insufficient permissions. Required: ${permissions.join(', ')}`);
      }

      // Attach user to request for use in controllers
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check if user has a specific role
 */
export function requireRole(...roles: TenantUserRole[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void> {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        throw new ForbiddenError('Authentication required');
      }

      const authPayload = req.auth as any;
      const isAdmin = await isAdminRequest(authPayload);

      if (isAdmin) {
        next();
        return;
      }

      const userRepo: Repository<TenantUser> = AppDataSource.getRepository(TenantUser);
      const user = await userRepo.findOne({
        where: { id: req.auth.sub },
      });

      if (!user) {
        throw new ForbiddenError('User not found');
      }

      if (!roles.includes(user.role)) {
        throw new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`);
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}


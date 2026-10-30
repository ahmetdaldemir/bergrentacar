import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError, ForbiddenError } from '../../../utils/errors';
import { toPublicTenant, toPublicSettingsBundle } from '../auth-response.dto';
import { TenantFeaturesService } from '../../shared/services/tenant-features.service';
import { SITE_TENANT_ID } from '../../../security/bergrentacar-site';

function publicUserFields(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  allowedNavKeys?: string[] | null;
  dashboardLayout?: Record<string, unknown> | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    allowedNavKeys: user.allowedNavKeys ?? null,
    dashboardLayout: user.dashboardLayout ?? null,
  };
}

export class AuthController {
  static register = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { tenantId, name, email, password, role } = req.body;
    if (!tenantId || !name || !email || !password) throw new ValidationError('tenantId, name, email and password are required');
    if (tenantId !== SITE_TENANT_ID) throw new ForbiddenError('Forbidden');
    if (req.tenant && req.tenant.id !== tenantId) throw new ForbiddenError('Tenant mismatch: Cannot register user for different tenant');
    const user = await AuthService.register({ tenantId, name, email, password, role });
    sendSuccess(res, { id: user.id, tenantId: user.tenantId, email: user.email, role: user.role }, 201);
  });

  static login = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) throw new ValidationError('email and password are required');
    const { token, user, tenant, settings } = await AuthService.login({ email, password });
    if (req.tenant && req.tenant.id !== user.tenantId) throw new ForbiddenError('Tenant mismatch: This user does not belong to this tenant');
    sendSuccess(res, {
      token,
      user: publicUserFields(user),
      tenant: toPublicTenant(tenant),
      settings: toPublicSettingsBundle(settings),
    });
  });

  static signup = asyncHandler(async (_req: Request, _res: Response) => {
    throw new ForbiddenError('This installation does not accept new organizations');
  });

  static me = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const { user, tenant, settings } = await AuthService.getProfile(req.auth.sub);
    if (user.tenantId !== SITE_TENANT_ID) throw new ForbiddenError('Forbidden');
    if (req.tenant && req.tenant.id !== user.tenantId) throw new ForbiddenError('Tenant mismatch: This user does not belong to this tenant');
    const features = await TenantFeaturesService.getMergedFeatures(user.tenantId);
    sendSuccess(res, {
      user: publicUserFields(user),
      tenant: toPublicTenant(tenant),
      settings: toPublicSettingsBundle(settings),
      features,
    });
  });

  static updateDashboardLayout = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    if (!req.auth?.sub || !req.auth.tenantId) throw new UnauthorizedError('Unauthorized');
    if (req.auth.tenantId !== SITE_TENANT_ID) throw new ForbiddenError('Forbidden');
    const body = req.body as { widgets?: unknown };
    const updated = await AuthService.updateDashboardLayout(req.auth.sub, req.auth.tenantId, body);
    sendSuccess(res, { dashboardLayout: updated.dashboardLayout ?? null });
  });

  static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    sendSuccess(res, { message: 'Logged out successfully' });
  });
}

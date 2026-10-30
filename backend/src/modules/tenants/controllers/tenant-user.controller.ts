import { Response } from 'express';
import { TenantUserService } from '../services/tenant-user.service';
import { TenantUserRole } from '../entities/tenant-user.entity';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, UnauthorizedError } from '../../../utils/errors';

function stripPassword(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export class TenantUserController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const users = await TenantUserService.list(tenantId);
    sendSuccess(res, users.map(stripPassword));
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const user = await TenantUserService.getById(id, tenantId);
    if (!user) throw new NotFoundError('Kullanıcı', id);
    sendSuccess(res, stripPassword(user));
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) throw new ValidationError('name, email ve password gereklidir');
    if (role && !Object.values(TenantUserRole).includes(role)) throw new ValidationError('Geçersiz rol');
    if (password.length < 6) throw new ValidationError('Şifre en az 6 karakter olmalıdır');
    const user = await TenantUserService.create({ tenantId, name, email, password, role });
    sendSuccess(res, stripPassword(user), 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { name, email, password, role, allowedNavKeys } = req.body;
    if (role && !Object.values(TenantUserRole).includes(role)) throw new ValidationError('Geçersiz rol');
    if (password && password.length < 6) throw new ValidationError('Şifre en az 6 karakter olmalıdır');
    const user = await TenantUserService.update(id, tenantId, { name, email, password, role, allowedNavKeys });
    sendSuccess(res, stripPassword(user));
  });

  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    await TenantUserService.delete(id, tenantId);
    res.status(204).send();
  });
}

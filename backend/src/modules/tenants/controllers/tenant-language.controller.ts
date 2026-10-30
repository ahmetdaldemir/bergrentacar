import { Response } from 'express';
import { TenantLanguageService } from '../services/tenant-language.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '../../../utils/errors';

export class TenantLanguageController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin kullanıcıları için tenantId query'den alınmalı
    // Tenant kullanıcıları için auth'tan veya query'den alınabilir
    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const tenantId = isAdmin ? req.query.tenantId : (auth && 'tenantId' in auth ? auth.tenantId : req.query.tenantId);
    
    if (!tenantId) throw new ValidationError('tenantId is required');
    
    // Tenant kullanıcıları sadece kendi tenant'larına erişebilir
    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }
    
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const tenantLanguages = await TenantLanguageService.list(tenantId as string, isActive);
    sendSuccess(res, tenantLanguages);
  });

  static getActiveLanguageIds = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin kullanıcıları için tenantId query'den alınmalı
    // Tenant kullanıcıları için auth'tan veya query'den alınabilir
    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const tenantId = isAdmin ? req.query.tenantId : (auth && 'tenantId' in auth ? auth.tenantId : req.query.tenantId);
    
    if (!tenantId) throw new ValidationError('tenantId is required');
    
    // Tenant kullanıcıları sadece kendi tenant'larına erişebilir
    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }
    
    const languageIds = await TenantLanguageService.getActiveLanguageIds(tenantId as string);
    sendSuccess(res, { languageIds });
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin kullanıcıları için tenantId query'den alınmalı
    // Tenant kullanıcıları için auth'tan veya query'den alınabilir
    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const tenantId = isAdmin ? req.query.tenantId : (auth && 'tenantId' in auth ? auth.tenantId : req.query.tenantId);
    
    if (!tenantId) throw new ValidationError('tenantId is required');
    
    // Tenant kullanıcıları sadece kendi tenant'larına erişebilir
    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }
    
    const { id } = req.params;
    const tenantLanguage = await TenantLanguageService.getById(id, tenantId as string);
    if (!tenantLanguage) throw new NotFoundError('Tenant language', id);
    sendSuccess(res, tenantLanguage);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin kullanıcıları için tenantId body'den alınmalı
    // Tenant kullanıcıları için auth'tan veya body'den alınabilir
    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const tenantId = isAdmin ? req.body.tenantId : (auth && 'tenantId' in auth ? auth.tenantId : req.body.tenantId);
    
    if (!tenantId) throw new ValidationError('tenantId is required');
    
    // Tenant kullanıcıları sadece kendi tenant'larına erişebilir
    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }
    
    const { languageId, isActive, sortOrder } = req.body;
    if (!languageId) throw new ValidationError('languageId is required');
    const tenantLanguage = await TenantLanguageService.create({
      tenantId: tenantId as string,
      languageId,
      isActive,
      sortOrder,
    });
    sendSuccess(res, tenantLanguage, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin kullanıcıları için tenantId query'den alınmalı
    // Tenant kullanıcıları için auth'tan veya query'den alınabilir
    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const tenantId = isAdmin ? req.query.tenantId : (auth && 'tenantId' in auth ? auth.tenantId : req.query.tenantId);
    
    if (!tenantId) throw new ValidationError('tenantId is required');
    
    // Tenant kullanıcıları sadece kendi tenant'larına erişebilir
    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }
    
    const { id } = req.params;
    const { isActive, isDefault, sortOrder } = req.body;
    const tenantLanguage = await TenantLanguageService.update(id, tenantId as string, {
      isActive,
      isDefault,
      sortOrder,
    });
    sendSuccess(res, tenantLanguage);
  });

  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin kullanıcıları için tenantId query'den alınmalı
    // Tenant kullanıcıları için auth'tan veya query'den alınabilir
    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const tenantId = isAdmin ? req.query.tenantId : (auth && 'tenantId' in auth ? auth.tenantId : req.query.tenantId);
    
    if (!tenantId) throw new ValidationError('tenantId is required');
    
    // Tenant kullanıcıları sadece kendi tenant'larına erişebilir
    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }
    
    const { id } = req.params;
    await TenantLanguageService.delete(id, tenantId as string);
    res.status(204).send();
  });

  static bulkUpdate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin kullanıcıları için tenantId body'den alınmalı
    // Tenant kullanıcıları için auth'tan veya body'den alınabilir
    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const tenantId = isAdmin ? req.body.tenantId : (auth && 'tenantId' in auth ? auth.tenantId : req.body.tenantId);
    
    if (!tenantId) throw new ValidationError('tenantId is required');
    
    // Tenant kullanıcıları sadece kendi tenant'larına erişebilir
    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }
    
    const { languageIds } = req.body;
    if (!Array.isArray(languageIds)) throw new ValidationError('languageIds must be an array');
    const tenantLanguages = await TenantLanguageService.bulkUpdate({ tenantId: tenantId as string, languageIds });
    sendSuccess(res, tenantLanguages);
  });

  static initialize = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin kullanıcıları için tenantId body'den alınmalı
    // Tenant kullanıcıları için auth'tan veya body'den alınabilir
    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const tenantId = isAdmin ? req.body.tenantId : (auth && 'tenantId' in auth ? auth.tenantId : req.body.tenantId);
    
    if (!tenantId) throw new ValidationError('tenantId is required');
    
    // Tenant kullanıcıları sadece kendi tenant'larına erişebilir
    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }
    
    const tenantLanguages = await TenantLanguageService.initializeFromActiveLanguages(tenantId, false);
    sendSuccess(res, tenantLanguages, 201);
  });

  static setDefault = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin kullanıcıları için tenantId query'den alınmalı
    // Tenant kullanıcıları için auth'tan veya query'den alınabilir
    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const tenantId = isAdmin ? req.query.tenantId : (auth && 'tenantId' in auth ? auth.tenantId : req.query.tenantId);
    
    if (!tenantId) throw new ValidationError('tenantId is required');
    
    // Tenant kullanıcıları sadece kendi tenant'larına erişebilir
    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }
    
    const { id } = req.params;
    const tenantLanguage = await TenantLanguageService.setDefaultLanguage(tenantId as string, id);
    sendSuccess(res, tenantLanguage);
  });
}

/**
 * Authenticate edilmiş istekte tenantId zorunluluğu.
 * authenticate() sonrası kullanılır; req.tenantId set edilir.
 */

import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../modules/auth/middleware/auth.middleware';
import { UnauthorizedError } from '../utils/errors';
import { getTenantIdFromAuth } from '../utils/validation';

export interface RequestWithTenantId extends Request {
  tenantId?: string;
}

/**
 * authenticate() sonrası kullanın. req.auth.tenantId yoksa 401 döner;
 * varsa req.tenantId set edilir (controller'da getTenantIdFromAuth yerine req.tenantId kullanılabilir).
 */
export function requireTenantId(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const tenantId = getTenantIdFromAuth(req as Request);
    if (!tenantId) {
      return next(new UnauthorizedError('Authentication required'));
    }
    (req as RequestWithTenantId).tenantId = tenantId;
    next();
  } catch (e) {
    next(e);
  }
}

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { loadEnv } from '../../../config/env';
import { AuthTokenPayload } from '../services/auth.service';
import { AdminTokenPayload } from '../../admin/services/admin-auth.service';
import { TenantUser } from '../../tenants/entities/tenant-user.entity';
import { SITE_TENANT_ID } from '../../../security/bergrentacar-site';

const env = loadEnv();

export interface AuthenticatedRequest extends Request {
  auth?: AuthTokenPayload | AdminTokenPayload;
  user?: TenantUser; // Set by authorize middleware
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, env.auth.jwtSecret) as any;
    if (typeof payload?.tenantId === 'string' && payload.tenantId !== SITE_TENANT_ID) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.auth = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

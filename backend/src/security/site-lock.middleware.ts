import { NextFunction, Request, Response } from 'express';
import {
  isAllowedHostHeader,
  isAllowedSiteOrigin,
  isBergrentacarDomainOnline,
  SITE_TENANT_ID,
} from './bergrentacar-site';

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Every request must arrive on bergrentacar.com.
 * A mismatched Host or X-Forwarded-Host means this copy is installed on another domain.
 */
export function siteLockMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isBergrentacarDomainOnline()) {
    res.status(403).type('text/plain').send('bergrentacar.com is not available. This installation is stopped.');
    return;
  }

  if (!isAllowedHostHeader(headerValue(req.headers.host))) {
    res.status(403).type('text/plain').send('This application only runs on bergrentacar.com');
    return;
  }

  const forwarded = req.headers['x-forwarded-host'];
  if (forwarded && !isAllowedHostHeader(forwarded)) {
    res.status(403).type('text/plain').send('This application only runs on bergrentacar.com');
    return;
  }

  const origin = headerValue(req.headers.origin);
  if (origin && !isAllowedSiteOrigin(origin)) {
    res.status(403).type('text/plain').send('This application only runs on bergrentacar.com');
    return;
  }

  const requestedTenant = headerValue(req.headers['x-tenant-id']);
  if (requestedTenant && requestedTenant !== SITE_TENANT_ID) {
    res.status(403).type('text/plain').send('This application only serves bergrentacar.com');
    return;
  }

  next();
}

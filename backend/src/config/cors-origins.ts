/**
 * CORS is limited to bergrentacar.com. Extra origins from the environment are ignored.
 */
import { logger } from '../utils/logger';
import { isAllowedSiteOrigin } from '../security/bergrentacar-site';

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return isAllowedSiteOrigin(origin);
}

export function corsOriginCallback(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (isCorsOriginAllowed(origin)) {
    callback(null, true);
    return;
  }

  logger.warn(`[CORS] Origin rejected: ${origin}`);
  callback(new Error('Not allowed by CORS'));
}

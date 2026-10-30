/**
 * Ortak validasyon helper'ları.
 * Controller'larda tenantId ve id doğrulaması tek yerde.
 */

import { Request } from 'express';
import { AuthenticatedRequest } from '../modules/auth/middleware/auth.middleware';
import { UnauthorizedError, ValidationError } from './errors';

/** UUID v4 basit regex (hyphen'lı) */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Authenticate edilmiş istekten tenantId alır; yoksa UnauthorizedError fırlatır.
 * Admin kullanıcıları için undefined döner (tenantId body/query'den alınmalı).
 * Kullanım: const tenantId = getTenantIdFromAuth(req);
 */
export function getTenantIdFromAuth(req: Request): string | undefined {
  const auth = (req as AuthenticatedRequest).auth;
  // Admin kullanıcıları için tenantId yok
  if (auth && 'type' in auth && auth.type === 'admin') {
    return undefined; // Admin kullanıcıları için body/query'den alınmalı
  }
  if (!auth || !('tenantId' in auth)) {
    throw new UnauthorizedError('Authentication required');
  }
  const tenantId = auth.tenantId;
  if (!tenantId) throw new UnauthorizedError('Authentication required');
  return tenantId;
}

/**
 * Parametre veya body'den gelen id'nin geçerli (boş değil) olduğunu doğrular.
 * @param name Parametre adı (örn. 'id', 'vehicleId')
 * @param value Değer (string | undefined)
 * @param optional true ise undefined/boş geçerli kabul edilir
 */
export function validateId(name: string, value: string | undefined, optional = false): string | undefined {
  const trimmed = typeof value === 'string' ? value.trim() : undefined;
  if (optional && (trimmed === undefined || trimmed === '')) return undefined;
  if (!trimmed) throw new ValidationError(`${name} is required`);
  return trimmed;
}

/**
 * Değerin UUID formatında olduğunu doğrular (opsiyonel).
 * Id zaten validateId ile alındıysa sadece format için kullanılabilir.
 */
export function validateUuid(value: string, paramName = 'id'): void {
  if (!UUID_REGEX.test(value)) {
    throw new ValidationError(`Invalid ${paramName}: must be a valid UUID`);
  }
}

/**
 * Id parametresini alır ve (isteğe bağlı) UUID formatında doğrular.
 * @param req Express request (params veya body'den alınacak key)
 * @param paramKey Parametre adı (örn. 'id', 'vehicleId'). Varsayılan 'id'
 * @param fromBody true ise req.body[paramKey], yoksa req.params[paramKey]
 */
export function requireId(
  req: Request,
  paramKey: string = 'id',
  options?: { fromBody?: boolean; uuid?: boolean }
): string {
  const value = options?.fromBody ? (req.body as any)[paramKey] : (req.params as any)[paramKey];
  const id = validateId(paramKey, value, false)!;
  if (options?.uuid) validateUuid(id, paramKey);
  return id;
}

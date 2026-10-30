import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisAvailable } from '../config/redis.config';
import { TenantSettingsService } from '../modules/shared/services/tenant-settings.service';

/** Varsayılan 24 saat (saniye) */
export const DEFAULT_PUBLIC_API_CACHE_TTL_SECONDS = 86400;

const ttlMemory = new Map<string, { expires: number; seconds: number }>();
const TTL_MEM_MS = 60_000;

export function invalidateTenantApiCacheTtlMemory(tenantId: string): void {
  ttlMemory.delete(tenantId);
}

/**
 * Bu tenant için public API GET cache anahtarlarını siler (`api:v1:*:{tenantId}:*`).
 * @returns Silinen anahtar sayısı; Redis yoksa 0.
 */
export async function invalidatePublicApiCacheForTenant(tenantId: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return 0;
  try {
    const pattern = `api:v1:*:${tenantId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch {
    return 0;
  }
}

/** `GET /api/currencies` (boş query) — publicApiResponseCache ile aynı anahtar */
export const PUBLIC_API_CURRENCIES_LIST_CACHE_KEY = 'api:v1:currencies:list:global:';

/**
 * Global para birimi listesi önbelleğini siler (kur güncellemesi / CRUD sonrası).
 * @returns Silinen anahtar sayısı (0 veya 1); Redis yoksa 0.
 */
export async function invalidatePublicApiCurrenciesListCache(): Promise<number> {
  const redis = getRedisClient();
  if (!redis || !isRedisAvailable()) return 0;
  try {
    return await redis.del(PUBLIC_API_CURRENCIES_LIST_CACHE_KEY);
  } catch {
    return 0;
  }
}

async function resolveTtlSeconds(tenantId?: string): Promise<number> {
  if (!tenantId) {
    const n = Number(process.env.API_PUBLIC_CACHE_TTL_SECONDS);
    return Number.isFinite(n) && n >= 60 ? n : DEFAULT_PUBLIC_API_CACHE_TTL_SECONDS;
  }
  const mem = ttlMemory.get(tenantId);
  if (mem && mem.expires > Date.now()) {
    return mem.seconds;
  }
  const seconds = await TenantSettingsService.getApiCacheTtlSeconds(tenantId);
  ttlMemory.set(tenantId, { expires: Date.now() + TTL_MEM_MS, seconds });
  return seconds;
}

function buildCacheKey(routeKey: string, tenantId: string | undefined, parts: Record<string, string>): string {
  const sorted = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k]}`)
    .join('&');
  const scope = tenantId || 'global';
  return `api:v1:${routeKey}:${scope}:${sorted}`;
}

export type PublicApiCacheOptions = {
  routeKey: string;
  queryKeys: string[];
  /** tenantId query yoksa cache uygulanmaz */
  requireTenant?: boolean;
};

/**
 * Sadece GET. Redis yoksa veya koşullar sağlanmazsa next().
 * Başarılı JSON cevapları ({ success: true }) Redis'e yazılır.
 */
export function publicApiResponseCache(options: PublicApiCacheOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const redis = getRedisClient();
    if (!redis || !isRedisAvailable()) {
      next();
      return;
    }

    const tenantId = (req.query.tenantId as string) || undefined;
    if (options.requireTenant && !tenantId) {
      next();
      return;
    }

    const parts: Record<string, string> = {};
    for (const k of options.queryKeys) {
      const v = req.query[k];
      if (v !== undefined && v !== null && String(v) !== '') {
        parts[k] = String(v);
      }
    }

    const key = buildCacheKey(options.routeKey, tenantId, parts);

    try {
      const hit = await redis.get(key);
      if (hit) {
        const body = JSON.parse(hit) as unknown;
        res.setHeader('X-API-Cache', 'HIT');
        res.status(200).json(body);
        return;
      }
    } catch {
      // miss
    }

    const ttl = await resolveTtlSeconds(tenantId);

    res.setHeader('X-API-Cache', 'MISS');
    const origJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (body && typeof body === 'object' && (body as { success?: boolean }).success === true) {
        try {
          redis.setex(key, ttl, JSON.stringify(body)).catch(() => {});
        } catch {
          // ignore
        }
      }
      return origJson(body);
    };

    next();
  };
}

import crypto from 'crypto';
import Redis from 'ioredis';
import { getRedisClient } from '../config/redis.config';
import { TenantSettingsService } from '../modules/shared/services/tenant-settings.service';

/** Varsayılan: 24 saat (tenant ayarı yoksa ve global cache için) */
export const DEFAULT_API_CACHE_TTL_SECONDS = 86400;

function hashQueryParts(query: Record<string, unknown>, keys: string[]): string {
  const sorted = [...keys].sort().filter((k) => query[k] !== undefined && query[k] !== '');
  const parts = sorted.map((k) => `${k}=${String(query[k])}`);
  const raw = parts.join('&') || '_';
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 20);
}

export class ApiCacheService {
  /**
   * Tenant metadata `apiCacheTtlHours` (1–168 saat) → saniye. Yoksa 24 saat.
   */
  static async getTtlSecondsForTenant(tenantId: string): Promise<number> {
    return TenantSettingsService.getApiCacheTtlSeconds(tenantId);
  }

  static async getTtlSecondsGlobal(): Promise<number> {
    const fromEnv = process.env.API_CACHE_GLOBAL_TTL_SECONDS;
    if (fromEnv) {
      const n = Number(fromEnv);
      if (Number.isFinite(n) && n >= 60) return Math.floor(n);
    }
    return DEFAULT_API_CACHE_TTL_SECONDS;
  }

  static buildKey(params: {
    tenantId?: string;
    route: string;
    variant: string;
    queryHash?: string;
  }): string {
    const tid = params.tenantId ?? 'global';
    const qh = params.queryHash ? `:${params.queryHash}` : '';
    return `api_cache:${tid}:${params.route}:${params.variant}${qh}`;
  }

  static queryHash(reqQuery: Record<string, unknown>, keys: string[]): string {
    return hashQueryParts(reqQuery, keys);
  }

  static async getJson(key: string): Promise<unknown | null> {
    const redis = getRedisClient();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  static async setJson(key: string, value: unknown, ttlSec: number): Promise<void> {
    const redis = getRedisClient();
    if (!redis || ttlSec <= 0) return;
    try {
      await redis.setex(key, ttlSec, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  static async deleteByPattern(redis: Redis, pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const reply = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  /** Tenant’a ait tüm api_cache anahtarlarını siler (blogs, destinations, settings, crm …). */
  static async invalidateTenant(tenantId: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      await this.deleteByPattern(redis, `api_cache:${tenantId}:*`);
    } catch {
      // ignore
    }
  }

  static async invalidateGlobalCurrencies(): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    try {
      await this.deleteByPattern(redis, 'api_cache:global:currencies*');
    } catch {
      // ignore
    }
  }
}

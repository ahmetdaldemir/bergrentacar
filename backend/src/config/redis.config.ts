import Redis from 'ioredis';
import { loadEnv } from './env';

let redisClient: Redis | null = null;
/** Ayrı bağlantı: BRPOP gibi uzun süren komutlar için (ana client commandTimeout 500ms) */
let redisBlockingClient: Redis | null = null;
let redisAvailable = false;
let connectionErrorLogged = false;
let redisDisabled = false;

const isConnectionError = (error: any): boolean => {
  const errorMessage = error?.message || '';
  const errorCode = error?.code || '';
  
  return (
    errorCode === 'ECONNREFUSED' ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('NOAUTH') ||
    errorMessage.includes('AggregateError') ||
    errorMessage.includes('MaxRetriesPerRequestError')
  );
};

/** Tüm Redis ayarları yalnızca ortam değişkenlerinden (.env → dotenv → process.env). Hardcode yok. */
function readRedisEnv() {
  loadEnv();
  const host = process.env.REDIS_HOST || 'localhost';
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD?.trim() || undefined;
  const username = process.env.REDIS_USERNAME?.trim() || undefined;
  const useTls = process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === '1';
  return { host, port, password, username, useTls };
}

export const getRedisClient = (): Redis | null => {
  // If Redis is disabled, return null
  if (redisDisabled) {
    return null;
  }
  
  if (redisClient) {
    return redisClient;
  }

  const { host: redisHost, port: redisPort, password: redisPassword, username: redisUsername, useTls } =
    readRedisEnv();

  // If Redis is disabled (for scripts running locally), mark as disabled and return null
  if (redisHost === 'disabled' || redisHost === '') {
    redisDisabled = true;
    redisAvailable = false;
    return null;
  }

  // Only include password if it's provided and not empty
  const redisConfig: any = {
    host: redisHost,
    port: redisPort,
    ...(redisUsername ? { username: redisUsername } : {}),
    ...(useTls ? { tls: { rejectUnauthorized: true } } : {}),
    retryStrategy: (times: number) => {
      // Stop retrying after 10 attempts (silent mode)
      if (times > 10) {
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    commandTimeout: 500,   // Abort commands that don't complete within 500ms
    connectTimeout: 5000,  // Abort TCP connect attempts after 5s
    enableReadyCheck: true,
    lazyConnect: true, // Connect manually in server.ts
    enableOfflineQueue: false, // Don't queue commands when offline
  };

  // Only add password if it's provided
  if (redisPassword && redisPassword.length > 0) {
    redisConfig.password = redisPassword;
  }

  redisClient = new Redis(redisConfig);

  redisClient.on('error', (error) => {
    // Only log connection errors once to avoid spam
    if (isConnectionError(error)) {
      if (!connectionErrorLogged) {
        console.warn('⚠️  Redis not available, continuing without cache');
        connectionErrorLogged = true;
        redisAvailable = false;
      }
      return;
    }
    
    // Log other errors (but only once)
    if (!connectionErrorLogged) {
      console.error('❌ Redis error:', error.message || error);
      connectionErrorLogged = true;
    }
  });

  redisClient.on('connect', () => {
    connectionErrorLogged = false;
    redisAvailable = true;
    console.log('✅ Redis connected');
  });

  redisClient.on('ready', () => {
    redisAvailable = true;
    console.log('✅ Redis ready');
  });

  redisClient.on('close', () => {
    redisAvailable = false;
    // Only log close if we were previously connected
    if (connectionErrorLogged === false) {
      console.warn('⚠️  Redis connection closed');
    }
  });

  return redisClient;
};

/**
 * AI job worker BRPOP vb. için. Ana Redis client'ta commandTimeout kısa olduğundan
 * uzun bloklayan komutlar "Command timed out" verir; bu client'ta timeout BRPOP süresinden uzun.
 */
export const getRedisBlockingClient = (): Redis | null => {
  if (redisDisabled) {
    return null;
  }
  if (redisBlockingClient) {
    return redisBlockingClient;
  }

  const { host: redisHost, port: redisPort, password: redisPassword, username: redisUsername, useTls } =
    readRedisEnv();

  if (redisHost === 'disabled' || redisHost === '') {
    return null;
  }

  const blockingConfig: any = {
    host: redisHost,
    port: redisPort,
    ...(redisUsername ? { username: redisUsername } : {}),
    ...(useTls ? { tls: { rejectUnauthorized: true } } : {}),
    maxRetriesPerRequest: null,
    commandTimeout: 35000,
    connectTimeout: 5000,
    enableReadyCheck: true,
    lazyConnect: true,
    enableOfflineQueue: false,
  };
  if (redisPassword && redisPassword.length > 0) {
    blockingConfig.password = redisPassword;
  }

  redisBlockingClient = new Redis(blockingConfig);
  redisBlockingClient.on('error', (err) => {
    console.warn('Redis blocking client error:', err?.message || err);
  });
  return redisBlockingClient;
};

export const isRedisAvailable = (): boolean => {
  if (redisDisabled) {
    return false;
  }
  return redisAvailable && redisClient !== null;
};

export const closeRedisClient = async (): Promise<void> => {
  if (redisBlockingClient) {
    await redisBlockingClient.quit().catch(() => {});
    redisBlockingClient = null;
  }
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};


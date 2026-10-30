import dotenv from 'dotenv';

// Load .env file but allow environment variables to override
dotenv.config({ override: false });

export type AppConfig = {
  nodeEnv: string;
  app: {
    port: number;
    baseUrl: string;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    /**
     * TypeORM synchronize: schema değişikliklerini DB’ye uygular.
     * Kapalıyken (production önerisi) manuel migration/SQL gerekir.
     */
    synchronize: boolean;
  };
  auth: {
    jwtSecret: string;
    tokenExpiresIn: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from?: string;
  };
  integrations: {
    rapidApiKey?: string;
    rapidApiTravelAdvisorHost?: string;
    openAiApiKey?: string;
  };
  cloudflareImages?: {
    accountId?: string;
    apiToken?: string;
    variant?: string;
  };
};

let cachedConfig: AppConfig | null = null;

export const loadEnv = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const {
    NODE_ENV = 'development',
    APP_PORT = '4001',
    APP_BASE_URL = 'http://localhost:4001',
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USERNAME = 'dev_user',
    DB_PASSWORD = 'dev_pass',
    DB_NAME = 'tour_saas',
    JWT_SECRET = 'supersecretjwt',
    JWT_EXPIRES_IN = '12h',
    // SMTP settings for system emails (backup notifications etc.)
    SMTP_HOST,
    SMTP_PORT = '587',
    SMTP_SECURE = 'false',
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    RAPIDAPI_KEY,
    RAPIDAPI_TRAVEL_ADVISOR_HOST,
    OPENAI_API_KEY,
    CLOUDFLARE_IMAGES_ACCOUNT_ID,
    CLOUDFLARE_IMAGES_API_TOKEN,
    CLOUDFLARE_IMAGES_VARIANT = 'public',
    /** true | 1 | yes: TypeORM tabloyu entity ile eşitler. false: kolon silinmez; eski build riski yok. */
    DB_SYNC = 'true',
  } = process.env;

  const dbSyncRaw = String(DB_SYNC).trim().toLowerCase();
  const databaseSynchronize = dbSyncRaw === 'true' || dbSyncRaw === '1' || dbSyncRaw === 'yes';

  cachedConfig = {
    nodeEnv: NODE_ENV,
    app: {
      port: Number(APP_PORT),
      baseUrl: APP_BASE_URL,
    },
    database: {
      host: DB_HOST,
      port: Number(DB_PORT),
      username: DB_USERNAME,
      password: DB_PASSWORD,
      name: DB_NAME,
      synchronize: databaseSynchronize,
    },
    auth: {
      jwtSecret: JWT_SECRET,
      tokenExpiresIn: JWT_EXPIRES_IN,
    },
    // SMTP config (optional - for system notifications)
    smtp: SMTP_HOST && SMTP_USER ? {
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === 'true',
      user: SMTP_USER,
      pass: SMTP_PASS || '',
      from: SMTP_FROM,
    } : undefined,
    integrations: {
      rapidApiKey: RAPIDAPI_KEY,
      rapidApiTravelAdvisorHost: RAPIDAPI_TRAVEL_ADVISOR_HOST,
      openAiApiKey: OPENAI_API_KEY,
    },
    cloudflareImages: CLOUDFLARE_IMAGES_ACCOUNT_ID && CLOUDFLARE_IMAGES_API_TOKEN ? {
      accountId: CLOUDFLARE_IMAGES_ACCOUNT_ID,
      apiToken: CLOUDFLARE_IMAGES_API_TOKEN,
      variant: CLOUDFLARE_IMAGES_VARIANT,
    } : undefined,
  };

  return cachedConfig;
};

/**
 * Yüklenmiş config'i döner. `loadEnv()` ile aynı davranır çünkü cache'li.
 * Yeni kod bu fonksiyonu kullanmalı; `loadEnv()` adı geriye dönük uyumluluk için kalır.
 */
export const getConfig = (): AppConfig => loadEnv();

/**
 * Sadece test ortamında kullanılır. Config'i kısmen override etmeye yarar.
 * Gerçek env değişkenlerini değiştirmez; sadece bellekteki cache'i günceller.
 *
 * @example
 * ```ts
 * // test setup'ta:
 * setConfigForTest({ auth: { jwtSecret: 'test-secret', tokenExpiresIn: '1h' } });
 * // test teardown'da:
 * resetConfig();
 * ```
 */
export const setConfigForTest = (overrides: Partial<AppConfig>): void => {
  const base = loadEnv();
  cachedConfig = {
    ...base,
    ...overrides,
    app: { ...base.app, ...(overrides.app ?? {}) },
    database: { ...base.database, ...(overrides.database ?? {}) },
    auth: { ...base.auth, ...(overrides.auth ?? {}) },
    integrations: { ...base.integrations, ...(overrides.integrations ?? {}) },
  };
};

/** Cache'i sıfırlar; test teardown'larında kullanılır. */
export const resetConfig = (): void => {
  cachedConfig = null;
};

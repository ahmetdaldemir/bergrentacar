import type { Tenant } from '../tenants/entities/tenant.entity';
import type { Currency } from '../shared/entities/currency.entity';
import type { TenantSettings } from '../shared/entities/tenant-settings.entity';

/**
 * Login / me yanıtında TypeORM entity doğrudan JSON'a verilince (decimal, döngü, getter)
 * bazı ortamlarda 500 + boş gövde oluşabiliyor. Sadece düz alanlar gönderilir.
 */
export function toPublicTenant(tenant: Tenant | null): PublicTenantDto | null {
  if (!tenant) return null;
  const c = tenant.defaultCurrency;
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    category: tenant.category,
    isActive: tenant.isActive,
    defaultLanguage: tenant.defaultLanguage,
    supportEmail: tenant.supportEmail ?? null,
    defaultCurrencyId: tenant.defaultCurrencyId ?? null,
    defaultCurrency: toPublicCurrency(c),
    createdAt: tenant.createdAt instanceof Date ? tenant.createdAt.toISOString() : tenant.createdAt,
    updatedAt: tenant.updatedAt instanceof Date ? tenant.updatedAt.toISOString() : tenant.updatedAt,
  };
}

function toPublicCurrency(c: Currency | null | undefined): PublicCurrencyDto | null {
  if (!c) return null;
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    symbol: c.symbol ?? null,
    rateToTry: c.rateToTry != null ? Number(c.rateToTry) : null,
    isBaseCurrency: c.isBaseCurrency,
    isActive: c.isActive,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  };
}

export type PublicCurrencyDto = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  rateToTry: number | null;
  isBaseCurrency: boolean;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type PublicTenantDto = {
  id: string;
  name: string;
  slug: string;
  category: string;
  isActive: boolean;
  defaultLanguage: string;
  supportEmail: string | null;
  defaultCurrencyId: string | null;
  defaultCurrency: PublicCurrencyDto | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

/**
 * TenantSettings entity doğrudan res.json ile gönderilince (metadata / getter / döngü)
 * 500 + boş gövde oluşabiliyor. Düz JSON nesnesine indirger.
 * site/mail/payment aynı satıra işaret edebilir — tek kopya üç anahtara verilir.
 */
export function toPublicSettingsBundle(settings: {
  site: TenantSettings | null;
  mail: TenantSettings | null;
  payment: TenantSettings | null;
}): {
  site: Record<string, unknown> | null;
  mail: Record<string, unknown> | null;
  payment: Record<string, unknown> | null;
} {
  const pick = settings.site ?? settings.mail ?? settings.payment;
  const plain = plainTenantSettingsRow(pick);
  return { site: plain, mail: plain, payment: plain };
}

function plainTenantSettingsRow(row: TenantSettings | null | undefined): Record<string, unknown> | null {
  if (!row) return null;
  try {
    const json = JSON.parse(
      JSON.stringify(row, (key, value) => {
        if (key === 'tenant') return undefined;
        if (typeof value === 'bigint') return value.toString();
        return value;
      })
    ) as Record<string, unknown>;
    if (typeof json.smtpPassword === 'string' && json.smtpPassword && json.smtpPassword !== '***') {
      json.smtpPassword = '***';
    }
    if (typeof json.openaiApiKey === 'string' && json.openaiApiKey) json.openaiApiKey = '***';
    if (typeof json.deeplApiKey === 'string' && json.deeplApiKey) json.deeplApiKey = '***';
    if (typeof json.googleMapsApiKey === 'string' && json.googleMapsApiKey) json.googleMapsApiKey = '***';
    return json;
  } catch {
    return {
      id: row.id,
      tenantId: row.tenantId,
      category: row.category,
    };
  }
}

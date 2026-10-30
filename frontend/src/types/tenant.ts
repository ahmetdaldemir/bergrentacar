/** Nested `settings` on tenant from GET /tenants?tenantId=... */
export interface TenantApiSettings {
  siteName?: string | null;
  siteDescription?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  companyTaxNumber?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
}

export interface TenantDefaultCurrency {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  code: string;
  name: string;
  symbol?: string;
  rateToTry?: string;
  isBaseCurrency?: boolean;
  isActive?: boolean;
  lastUpdatedAt?: string;
  autoUpdate?: boolean;
}

export interface TenantRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  name: string;
  slug: string;
  category?: string;
  isActive?: boolean;
  defaultLanguage?: string;
  supportEmail?: string | null;
  defaultCurrencyId?: string | null;
  defaultCurrency?: TenantDefaultCurrency | null;
  settings?: TenantApiSettings | null;
}

/** API sometimes concatenates two paths with a tab; split for logo vs favicon. */
function splitTabSeparatedPaths(value: string | null | undefined): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/\t+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Maps API `tenant.settings` to the legacy `settings.site` shape used by
 * Header, Footer, ContactUs, ReservationModal, etc.
 */
export function buildLegacySettingsFromTenantRecord(tenant: TenantRecord) {
  const s = tenant.settings;
  const logoCandidates = splitTabSeparatedPaths(s?.logoUrl ?? undefined);
  const favCandidates = splitTabSeparatedPaths(s?.faviconUrl ?? undefined);
  const logoUrl = logoCandidates[0] || favCandidates[0];
  const faviconUrl =
    favCandidates[1] ||
    logoCandidates[1] ||
    favCandidates[0] ||
    logoCandidates[0];

  const companyAddress = s?.companyAddress
    ? s.companyAddress.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim()
    : undefined;

  return {
    site: {
      siteName: s?.siteName ?? undefined,
      siteDescription: s?.siteDescription ?? undefined,
      logoUrl,
      faviconUrl,
      companyName: s?.companyName ?? tenant.name,
      companyAddress,
      companyPhone: s?.companyPhone ?? undefined,
      companyEmail: s?.companyEmail ?? tenant.supportEmail ?? undefined,
      companyWebsite: s?.companyWebsite ?? undefined,
      companyTaxNumber: s?.companyTaxNumber ?? undefined,
      fromEmail: s?.fromEmail ?? undefined,
      fromName: s?.fromName ? s.fromName.replace(/^\s+/, '').trim() : undefined,
    },
  };
}

export function parseTenantApiResponse(json: unknown): TenantRecord {
  let payload: unknown = json;

  if (payload && typeof payload === 'object' && 'success' in payload) {
    const s = (payload as { success?: boolean; data?: unknown }).success;
    if (s === false) {
      throw new Error('Tenant API returned success: false');
    }
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    const d = (payload as { data: unknown }).data;
    if (d && typeof d === 'object' && 'id' in d) {
      return d as TenantRecord;
    }
    if (Array.isArray(d) && d[0] && typeof d[0] === 'object' && 'id' in d[0]) {
      return d[0] as TenantRecord;
    }
  }

  if (payload && typeof payload === 'object' && 'id' in payload && typeof (payload as { id: unknown }).id === 'string') {
    return payload as TenantRecord;
  }
  if (Array.isArray(payload) && payload[0] && typeof payload[0] === 'object' && 'id' in payload[0]) {
    return payload[0] as TenantRecord;
  }

  throw new Error('Invalid tenant API response');
}

export const GOOGLE_ADS_ID = 'AW-18412983233';
export const COOKIE_SETTINGS_KEY = 'cookieSettings';
const SENT_TRANSACTIONS_KEY = 'ga_ads_sent_transactions';

export type CookieSettings = {
  necessary: boolean;
  performance: boolean;
  functionality: boolean;
  marketing: boolean;
};

export const DEFAULT_COOKIE_SETTINGS: CookieSettings = {
  necessary: true,
  performance: false,
  functionality: false,
  marketing: false,
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

export function loadCookieSettings(): CookieSettings | null {
  try {
    const raw = localStorage.getItem(COOKIE_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieSettings>;
    return {
      ...DEFAULT_COOKIE_SETTINGS,
      ...parsed,
      necessary: true,
    };
  } catch {
    return null;
  }
}

export function applyGoogleConsent(settings: CookieSettings) {
  const ads = settings.marketing ? 'granted' : 'denied';
  const analytics = settings.performance ? 'granted' : 'denied';
  const functionality = settings.functionality ? 'granted' : 'denied';

  gtag('consent', 'update', {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
    analytics_storage: analytics,
    functionality_storage: functionality,
    personalization_storage: functionality,
    security_storage: 'granted',
  });
}

export function saveCookieSettings(settings: CookieSettings) {
  const next: CookieSettings = { ...settings, necessary: true };
  localStorage.setItem(COOKIE_SETTINGS_KEY, JSON.stringify(next));
  applyGoogleConsent(next);
  return next;
}

function readSentTransactions(): string[] {
  try {
    const raw = localStorage.getItem(SENT_TRANSACTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function markTransactionSent(transactionId: string) {
  const sent = readSentTransactions();
  if (sent.includes(transactionId)) return;
  sent.push(transactionId);
  localStorage.setItem(SENT_TRANSACTIONS_KEY, JSON.stringify(sent.slice(-200)));
}

export function extractReservationId(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') return undefined;

  const candidates = [
    (response as { id?: unknown }).id,
    (response as { reservationId?: unknown }).reservationId,
    (response as { data?: { id?: unknown } }).data?.id,
    (response as { data?: { reservationId?: unknown } }).data?.reservationId,
    (response as { reservation?: { id?: unknown } }).reservation?.id,
  ];

  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return undefined;
}

export function trackReservationConversion(params: {
  confirmed?: boolean;
  reservationId?: string;
  totalPrice?: number;
  currencyCode?: string;
}) {
  if (!params.confirmed) return;

  const transactionId = params.reservationId?.trim();
  if (!transactionId) return;

  const sent = readSentTransactions();
  if (sent.includes(transactionId)) return;
  markTransactionSent(transactionId);

  const label = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL?.trim();
  const sendTo = label ? `${GOOGLE_ADS_ID}/${label}` : GOOGLE_ADS_ID;
  const currency = params.currencyCode?.trim().toUpperCase();
  const value =
    typeof params.totalPrice === 'number' && Number.isFinite(params.totalPrice) && params.totalPrice > 0
      ? params.totalPrice
      : undefined;

  gtag('event', 'conversion', {
    send_to: sendTo,
    transaction_id: transactionId,
    ...(value !== undefined ? { value } : {}),
    ...(currency ? { currency } : {}),
  });
}

export function trackSpaPageView() {
  gtag('event', 'page_view', {
    send_to: GOOGLE_ADS_ID,
    page_path: `${window.location.pathname}${window.location.search}`,
    page_location: window.location.href,
    page_title: document.title,
  });
}

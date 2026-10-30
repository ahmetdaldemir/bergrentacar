/**
 * bergrentacar.com site lock.
 * The allowed hosts are compiled into the program. Environment variables cannot add a domain.
 * The process also requires bergrentacar.com to exist in public DNS. If that name is
 * removed, startup fails and a running process exits.
 */

import { Resolver } from 'node:dns/promises';

export const SITE_TENANT_ID = '9930c947-f720-463c-ba1d-e1af921d5ffb';

const REQUIRED_DOMAIN = 'bergrentacar.com';
const PUBLIC_RESOLVERS = ['1.1.1.1', '8.8.8.8', '9.9.9.9'];
const DOMAIN_RECHECK_MS = 60_000;

let domainOnline = false;

export const ALLOWED_SITE_HOSTS = ['bergrentacar.com', 'www.bergrentacar.com'] as const;

/** Local pages are accepted only on this port. */
export const LOCAL_SITE_PORT = '8080';

const HOST_SET = new Set<string>(ALLOWED_SITE_HOSTS);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const PUBLIC_URL_ENV_KEYS = ['FRONTEND_URL', 'PUBLIC_URL', 'APP_URL', 'APP_PUBLIC_URL', 'CORS_EXTRA_ORIGINS'] as const;

export function hostnamesFromHeader(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : value.split(',');
  return parts
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) => part.replace(/:\d+$/, ''))
    .filter(Boolean);
}

export function isAllowedSiteHost(hostname: string | undefined | null): boolean {
  if (!hostname) return false;
  return HOST_SET.has(hostname.trim().toLowerCase().replace(/:\d+$/, ''));
}

function splitHostToken(token: string): { hostname: string; port: string } {
  const value = token.trim().toLowerCase();
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    if (end === -1) return { hostname: value, port: '' };
    const rest = value.slice(end + 1);
    return { hostname: value.slice(1, end), port: rest.startsWith(':') ? rest.slice(1) : '' };
  }
  const colon = value.lastIndexOf(':');
  if (colon > 0 && /^\d+$/.test(value.slice(colon + 1))) {
    return { hostname: value.slice(0, colon), port: value.slice(colon + 1) };
  }
  return { hostname: value, port: '' };
}

/** Public domain on any port, or localhost only on LOCAL_SITE_PORT. */
export function isAllowedHostToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const { hostname, port } = splitHostToken(token);
  if (HOST_SET.has(hostname)) return true;
  return LOCAL_HOSTS.has(hostname) && port === LOCAL_SITE_PORT;
}

export function isAllowedHostHeader(value: string | string[] | undefined): boolean {
  if (!value) return false;
  const parts = (Array.isArray(value) ? value : value.split(',')).map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 && parts.every((part) => isAllowedHostToken(part));
}

export function isAllowedSiteOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    if (HOST_SET.has(url.hostname.toLowerCase())) return true;
    return LOCAL_HOSTS.has(url.hostname.toLowerCase()) && url.port === LOCAL_SITE_PORT;
  } catch {
    return false;
  }
}

export function isBergrentacarDomainOnline(): boolean {
  return domainOnline;
}

async function resolverHasAddress(server: string): Promise<'ok' | 'missing'> {
  const resolver = new Resolver();
  resolver.setServers([server]);

  const lookup = async (resolve: () => Promise<string[]>): Promise<'ok' | 'nxdomain' | 'nodata' | 'error'> => {
    try {
      const addresses = await resolve();
      return addresses.length > 0 ? 'ok' : 'nodata';
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOTFOUND') return 'nxdomain';
      if (code === 'ENODATA') return 'nodata';
      return 'error';
    }
  };

  const ipv4 = await lookup(() => resolver.resolve4(REQUIRED_DOMAIN));
  if (ipv4 === 'ok') return 'ok';
  const ipv6 = await lookup(() => resolver.resolve6(REQUIRED_DOMAIN));
  if (ipv6 === 'ok') return 'ok';
  if (ipv4 === 'nxdomain') return 'missing';
  throw new Error(`resolver ${server} could not answer`);
}

/**
 * Confirms bergrentacar.com still exists in public DNS.
 * A hosts-file override cannot satisfy this, because the query goes to public resolvers.
 */
export async function assertBergrentacarDomainExists(): Promise<void> {
  let missing = 0;
  for (const server of PUBLIC_RESOLVERS) {
    try {
      const result = await resolverHasAddress(server);
      if (result === 'ok') {
        domainOnline = true;
        return;
      }
      missing += 1;
    } catch {
      missing += 0;
    }
  }

  domainOnline = false;
  if (missing > 0) {
    throw new Error('bergrentacar.com is not published in public DNS. This installation is stopped.');
  }
  throw new Error('bergrentacar.com could not be verified in public DNS. This installation is stopped.');
}

export function startBergrentacarDomainWatch(): void {
  const timer = setInterval(() => {
    void assertBergrentacarDomainExists().catch((error: unknown) => {
      domainOnline = false;
      const message = error instanceof Error ? error.message : 'bergrentacar.com domain check failed';
      console.error(`[bergrentacar-domain] ${message}`);
      process.exit(78);
    });
  }, DOMAIN_RECHECK_MS);
  timer.unref();
}

/** Refuse to boot when a public URL is configured for any other domain. */
export function assertInstallationAllowed(): void {
  for (const key of PUBLIC_URL_ENV_KEYS) {
    const raw = process.env[key];
    if (!raw || !raw.trim()) continue;
    const pieces = raw.split(',').map((part) => part.trim()).filter(Boolean);
    for (const piece of pieces) {
      const candidate = piece.includes('://') ? piece : `https://${piece}`;
      let hostname = '';
      try {
        hostname = new URL(candidate).hostname;
      } catch {
        throw new Error(`Refusing to start: ${key} is not a bergrentacar.com address`);
      }
      if (!isAllowedSiteHost(hostname)) {
        throw new Error(`Refusing to start: ${key} must be bergrentacar.com`);
      }
    }
  }
}

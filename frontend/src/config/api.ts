const SITE_HOSTS = new Set(['bergrentacar.com', 'www.bergrentacar.com']);

/** Same-origin API of this project. An environment variable cannot point the site elsewhere. */
export const API_BASE_URL = '/api';

export const TENANT_ID = '9930c947-f720-463c-ba1d-e1af921d5ffb';

export const getTenantId = (): string => TENANT_ID;

export const getApiAssetUrl = (assetPath: string): string => {
  if (!assetPath) return '';

  if (!assetPath.startsWith('http')) {
    return assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  }

  try {
    const url = new URL(assetPath);
    const onThisSite = SITE_HOSTS.has(url.hostname);
    const projectFile = url.pathname.startsWith('/uploads') || url.pathname.startsWith('/api');
    if (onThisSite || projectFile) return `${url.pathname}${url.search}`;
  } catch {
    return '';
  }

  return assetPath;
};

/** Keep pictures that were stored as remote /uploads links on this project's files. */
export function localUploadHtml(html: string): string {
  if (!html) return '';
  return html.replace(/https?:\/\/[^"'\\\s>]+(\/uploads\/[^"'\\\s>]+)/gi, '$1');
}

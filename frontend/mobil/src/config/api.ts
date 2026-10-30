/** This app only talks to bergrentacar.com. Environment variables cannot retarget it. */
export const API_BASE_URL = 'https://bergrentacar.com/api';

export const TENANT_ID = '9930c947-f720-463c-ba1d-e1af921d5ffb';

export const getTenantId = (): string => TENANT_ID;

export const getApiAssetUrl = (assetPath: string): string => {
  if (!assetPath) return '';
  if (assetPath.startsWith('http')) {
    try {
      const url = new URL(assetPath);
      if (url.pathname.startsWith('/uploads') || url.pathname.startsWith('/api')) {
        return `https://bergrentacar.com${url.pathname}${url.search}`;
      }
    } catch {
      return '';
    }
    return assetPath;
  }
  const cleanPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `https://bergrentacar.com${cleanPath}`;
};

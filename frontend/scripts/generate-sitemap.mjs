import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const site = JSON.parse(fs.readFileSync(path.join(root, 'src/seo/site.json'), 'utf8'));
const LOCALES = site.locales;
const SITE_URL = site.siteUrl.replace(/\/$/, '');
const DEFAULT_LOCALE = site.defaultLocale || 'tr';
const TENANT_ID = '9930c947-f720-463c-ba1d-e1af921d5ffb';

const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/destinations', changefreq: 'weekly', priority: '0.8' },
  { path: '/contact-us', changefreq: 'monthly', priority: '0.6' },
  { path: '/faq', changefreq: 'monthly', priority: '0.5' },
  { path: '/help-center', changefreq: 'monthly', priority: '0.5' },
  { path: '/company-info', changefreq: 'monthly', priority: '0.5' },
  { path: '/aydinlatma-metni', changefreq: 'yearly', priority: '0.3' },
  { path: '/cerez-aydinlatma-politikasi', changefreq: 'yearly', priority: '0.3' },
  { path: '/kvk-politikasi', changefreq: 'yearly', priority: '0.3' },
  { path: '/yonetim-bilgi-sistemleri-politikasi', changefreq: 'yearly', priority: '0.3' },
];

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

const API_BASE = 'https://bergrentacar.com/api';

function localePath(locale, routePath) {
  const clean = routePath === '/' ? '' : routePath.replace(/\/$/, '');
  return `/${locale}${clean}`;
}

function absoluteUrl(locale, routePath) {
  return `${SITE_URL}${localePath(locale, routePath)}`;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.destinations)) return payload.destinations;
    if (Array.isArray(payload.blogs)) return payload.blogs;
  }
  return [];
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

async function loadLanguages() {
  const payload = await fetchJson(`${API_BASE}/languages?tenantId=${TENANT_ID}`);
  const langs = parseList(payload).filter((lang) => lang?.isActive !== false && lang.code);
  const byCode = {};
  for (const lang of langs) {
    const code = String(lang.code).toLowerCase();
    if (LOCALES.includes(code)) byCode[code] = lang.id;
  }
  return byCode;
}

function translationForLocale(item, locale, languageId) {
  const translations = Array.isArray(item?.translations) ? item.translations : [];
  return (
    translations.find((tr) => tr.language?.code?.toLowerCase() === locale) ||
    translations.find((tr) => tr.languageId === languageId) ||
    translations.find((tr) => tr.language?.id === languageId) ||
    null
  );
}

function destinationSlug(item, locale, languageId) {
  const tr = translationForLocale(item, locale, languageId);
  const slug = tr?.slug?.trim();
  return slug || null;
}

function blogSlug(item, locale, languageId) {
  const tr = translationForLocale(item, locale, languageId);
  if (!tr) return null;
  if (tr.slug && String(tr.slug).trim()) return String(tr.slug).trim();
  try {
    const parsed = JSON.parse(tr.value || '{}');
    if (parsed?.slug && String(parsed.slug).trim()) return String(parsed.slug).trim();
  } catch {
    // ignore
  }
  return null;
}

function urlEntry({ loc, lastmod, changefreq, priority, alternates }) {
  const links = LOCALES.filter((code) => alternates[code]).map(
    (code) =>
      `    <xhtml:link rel="alternate" hreflang="${code}" href="${xmlEscape(alternates[code])}" />`,
  );
  const defaultHref = alternates[DEFAULT_LOCALE] || Object.values(alternates)[0];
  if (defaultHref) {
    links.push(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(defaultHref)}" />`,
    );
  }
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${links.join('\n')}
  </url>`;
}

function collectById(list, locale, languageId, getSlug, extraFilter) {
  const map = new Map();
  for (const item of list) {
    if (extraFilter && !extraFilter(item)) continue;
    const slug = getSlug(item, locale, languageId);
    if (!slug) continue;
    const current = map.get(item.id) || { lastmod: null, slugs: {} };
    current.slugs[locale] = slug;
    const lastmod = toDate(item.updatedAt || item.publishedAt || item.createdAt);
    if (lastmod && (!current.lastmod || lastmod > current.lastmod)) current.lastmod = lastmod;
    map.set(item.id, current);
  }
  return map;
}

function mergeMaps(target, source) {
  for (const [id, entry] of source) {
    const current = target.get(id) || { lastmod: null, slugs: {} };
    current.slugs = { ...current.slugs, ...entry.slugs };
    if (entry.lastmod && (!current.lastmod || entry.lastmod > current.lastmod)) {
      current.lastmod = entry.lastmod;
    }
    target.set(id, current);
  }
}

export async function buildSitemapXml() {
  const today = new Date().toISOString().slice(0, 10);
  const languageIds = await loadLanguages();
  const destinations = new Map();
  const blogs = new Map();

  for (const locale of LOCALES) {
    const languageId = languageIds[locale];
    if (!languageId) {
      console.warn(`No language id for ${locale}, skipping dynamic URLs`);
      continue;
    }

    try {
      const destPayload = await fetchJson(
        `${API_BASE}/destinations?tenantId=${TENANT_ID}&languageId=${languageId}`,
      );
      mergeMaps(
        destinations,
        collectById(
          parseList(destPayload),
          locale,
          languageId,
          destinationSlug,
          (item) => item.isActive !== false,
        ),
      );
    } catch (error) {
      console.warn(`Destinations fetch failed for ${locale}:`, error.message);
    }

    try {
      const blogPayload = await fetchJson(
        `${API_BASE}/blogs?tenantId=${TENANT_ID}&languageId=${languageId}`,
      );
      mergeMaps(
        blogs,
        collectById(
          parseList(blogPayload),
          locale,
          languageId,
          blogSlug,
          (item) => item.status === 'published' || !item.status,
        ),
      );
    } catch (error) {
      console.warn(`Blogs fetch failed for ${locale}:`, error.message);
    }
  }

  const urls = [];

  for (const page of STATIC_PAGES) {
    const alternates = Object.fromEntries(
      LOCALES.map((locale) => [locale, absoluteUrl(locale, page.path)]),
    );
    for (const locale of LOCALES) {
      urls.push(
        urlEntry({
          loc: alternates[locale],
          lastmod: today,
          changefreq: page.changefreq,
          priority: page.priority,
          alternates,
        }),
      );
    }
  }

  for (const entry of destinations.values()) {
    const alternates = {};
    for (const locale of LOCALES) {
      if (entry.slugs[locale]) {
        alternates[locale] = absoluteUrl(locale, `/destination/${entry.slugs[locale]}`);
      }
    }
    for (const locale of LOCALES) {
      if (!alternates[locale]) continue;
      urls.push(
        urlEntry({
          loc: alternates[locale],
          lastmod: entry.lastmod || today,
          changefreq: 'weekly',
          priority: '0.7',
          alternates,
        }),
      );
    }
  }

  for (const entry of blogs.values()) {
    const alternates = {};
    for (const locale of LOCALES) {
      if (entry.slugs[locale]) {
        alternates[locale] = absoluteUrl(locale, `/blog/${entry.slugs[locale]}`);
      }
    }
    for (const locale of LOCALES) {
      if (!alternates[locale]) continue;
      urls.push(
        urlEntry({
          loc: alternates[locale],
          lastmod: entry.lastmod || today,
          changefreq: 'weekly',
          priority: '0.6',
          alternates,
        }),
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;

  return {
    xml,
    stats: {
      urls: urls.length,
      destinations: destinations.size,
      blogs: blogs.size,
    },
  };
}

export async function writeSitemap(outFile) {
  const { xml, stats } = await buildSitemapXml();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, xml);
  return stats;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const { xml, stats } = await buildSitemapXml();
  const publicFile = path.join(root, 'public', 'sitemap.xml');
  fs.writeFileSync(publicFile, xml);
  console.log(`Wrote ${publicFile}`);
  const distDir = path.join(root, 'dist');
  if (fs.existsSync(distDir)) {
    const distFile = path.join(distDir, 'sitemap.xml');
    fs.writeFileSync(distFile, xml);
    console.log(`Wrote ${distFile}`);
  }
  console.log(
    `Sitemap: ${stats.urls} URLs (${stats.destinations} destinations, ${stats.blogs} blogs)`,
  );
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSitemapXml } from './generate-sitemap.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const site = JSON.parse(fs.readFileSync(path.join(root, 'src/seo/site.json'), 'utf8'));
const LOCALES = site.locales;
const SITE_URL = site.siteUrl.replace(/\/$/, '');

const dictionaries = {
  tr: JSON.parse(fs.readFileSync(path.join(root, 'src/locales/tr.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en.json'), 'utf8')),
  de: JSON.parse(fs.readFileSync(path.join(root, 'src/locales/de.json'), 'utf8')),
  ru: JSON.parse(fs.readFileSync(path.join(root, 'src/locales/ru.json'), 'utf8')),
};

const OG_LOCALE = { tr: 'tr_TR', en: 'en_US', de: 'de_DE', ru: 'ru_RU' };

function get(obj, keyPath) {
  return keyPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function t(locale, key, fallback = '') {
  const value = get(dictionaries[locale], key);
  if (typeof value === 'string' && value) return value;
  const en = get(dictionaries.en, key);
  if (typeof en === 'string' && en) return en;
  return fallback;
}

function localePath(locale, routePath) {
  const clean = routePath === '/' ? '' : routePath.replace(/\/$/, '');
  return `/${locale}${clean}`;
}

function absoluteUrl(locale, routePath) {
  return `${SITE_URL}${localePath(locale, routePath)}`;
}

function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'AutoRental'],
    '@id': `${SITE_URL}/#business`,
    name: site.name,
    alternateName: site.alternateName,
    url: SITE_URL,
    logo: site.logo,
    image: site.image,
    description:
      'Antalya ve Alanya başta olmak üzere Türkiye genelinde havalimanı araç kiralama, günlük ve uzun dönem rent a car hizmetleri.',
    telephone: site.telephone,
    email: site.email,
    priceRange: site.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.streetAddress,
      addressLocality: site.address.addressLocality,
      addressRegion: site.address.addressRegion,
      addressCountry: site.address.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: site.geo.latitude,
      longitude: site.geo.longitude,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    sameAs: site.sameAs,
    areaServed: { '@type': 'Country', name: 'Turkey' },
  };
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function buildHead({ locale, routePath, title, description, noindex = false }) {
  const url = absoluteUrl(locale, routePath);
  const desc = description.length > 160 ? `${description.slice(0, 157)}...` : description;
  const hreflang = noindex
    ? ''
    : LOCALES.map(
        (code) =>
          `<link data-rh="true" rel="alternate" hreflang="${code}" href="${absoluteUrl(code, routePath)}" />`,
      ).join('\n    ') +
      `\n    <link data-rh="true" rel="alternate" hreflang="x-default" href="${absoluteUrl('tr', routePath)}" />`;

  return `    <title data-rh="true">${escapeAttr(title)}</title>
    <meta data-rh="true" name="description" content="${escapeAttr(desc)}" />
    <meta data-rh="true" name="author" content="${escapeAttr(site.name)}" />
    <meta data-rh="true" name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow'}" />
    ${noindex ? '' : `<link data-rh="true" rel="canonical" href="${url}" />`}
    ${hreflang}
    <meta data-rh="true" property="og:type" content="website" />
    <meta data-rh="true" property="og:url" content="${url}" />
    <meta data-rh="true" property="og:title" content="${escapeAttr(title)}" />
    <meta data-rh="true" property="og:description" content="${escapeAttr(desc)}" />
    <meta data-rh="true" property="og:image" content="${site.image}" />
    <meta data-rh="true" property="og:image:width" content="1200" />
    <meta data-rh="true" property="og:image:height" content="630" />
    <meta data-rh="true" property="og:site_name" content="${escapeAttr(site.name)}" />
    <meta data-rh="true" property="og:locale" content="${OG_LOCALE[locale]}" />
    <meta data-rh="true" name="twitter:card" content="summary_large_image" />
    <meta data-rh="true" name="twitter:title" content="${escapeAttr(title)}" />
    <meta data-rh="true" name="twitter:description" content="${escapeAttr(desc)}" />
    <meta data-rh="true" name="twitter:image" content="${site.image}" />
    <script data-rh="true" type="application/ld+json">${JSON.stringify(organizationSchema())}</script>`;
}

function buildBody({ h1, description }) {
  return `<main><h1>${escapeAttr(h1)}</h1><p>${escapeAttr(description)}</p></main>`;
}

function pagesFor(locale) {
  return [
    {
      routePath: '/',
      title: t(locale, 'seo.home.title'),
      description: t(locale, 'seo.home.description'),
      h1: t(locale, 'hero.title'),
    },
    {
      routePath: '/contact-us',
      title: `${t(locale, 'header.contactUs')} | ${site.name}`,
      description: t(locale, 'contactUs.seoDescription'),
      h1: t(locale, 'header.contactUs'),
    },
    {
      routePath: '/faq',
      title: `${t(locale, 'header.faq')} | ${site.name}`,
      description: t(locale, 'faq.seoDescription'),
      h1: t(locale, 'header.faq'),
    },
    {
      routePath: '/help-center',
      title: `${t(locale, 'header.helpCenter')} | ${site.name}`,
      description: t(locale, 'helpCenter.seoDescription'),
      h1: t(locale, 'header.helpCenter'),
    },
    {
      routePath: '/company-info',
      title: `${t(locale, 'companyInfo.title')} | ${site.name}`,
      description: t(locale, 'companyInfo.seoDescription'),
      h1: t(locale, 'companyInfo.title'),
    },
    {
      routePath: '/destinations',
      title: t(locale, 'destinations.allDestinationsTitle', `Destinations | ${site.name}`),
      description: t(locale, 'destinations.allDestinationsDescription'),
      h1: t(locale, 'destinations.allDestinations', 'Destinations'),
    },
    {
      routePath: '/aydinlatma-metni',
      title: `${t(locale, 'aydinlatmaMetni.title')} | ${site.name}`,
      description: t(locale, 'aydinlatmaMetni.title'),
      h1: t(locale, 'aydinlatmaMetni.title'),
    },
    {
      routePath: '/cerez-aydinlatma-politikasi',
      title: `${t(locale, 'cerezAydinlatmaPolitikasi.title')} | ${site.name}`,
      description: t(locale, 'cerezAydinlatmaPolitikasi.title'),
      h1: t(locale, 'cerezAydinlatmaPolitikasi.title'),
    },
    {
      routePath: '/kvk-politikasi',
      title: `${t(locale, 'kvkPolitikasi.title')} | ${site.name}`,
      description: t(locale, 'kvkPolitikasi.title'),
      h1: t(locale, 'kvkPolitikasi.title'),
    },
    {
      routePath: '/yonetim-bilgi-sistemleri-politikasi',
      title: `${t(locale, 'yonetimBilgiSistemleriPolitikasi.title')} | ${site.name}`,
      description: t(locale, 'yonetimBilgiSistemleriPolitikasi.title'),
      h1: t(locale, 'yonetimBilgiSistemleriPolitikasi.title'),
    },
  ];
}

function writeHtml(template, locale, page) {
  const head = buildHead({
    locale,
    routePath: page.routePath,
    title: page.title,
    description: page.description,
    noindex: page.noindex,
  });
  const body = buildBody({ h1: page.h1, description: page.description });
  let html = template.replace(/<!--seo-head-->[\s\S]*?<!--\/seo-head-->/, `<!--seo-head-->\n${head}\n    <!--/seo-head-->`);
  html = html.replace(/<!--seo-body-->[\s\S]*?<!--\/seo-body-->/, `<!--seo-body-->${body}<!--/seo-body-->`);
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${locale}">`);

  const outDir =
    page.routePath === '/'
      ? path.join(dist, locale)
      : path.join(dist, locale, page.routePath.replace(/^\//, ''));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html missing. Run vite build first.');
  process.exit(1);
}

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

for (const locale of LOCALES) {
  for (const page of pagesFor(locale)) {
    writeHtml(template, locale, page);
  }
}

const { xml: sitemapXml, stats: sitemapStats } = await buildSitemapXml();
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemapXml);
fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'), sitemapXml);
console.log(`Prerendered ${LOCALES.length * pagesFor('tr').length} locale pages.`);
console.log(
  `Sitemap: ${sitemapStats.urls} URLs (${sitemapStats.destinations} destinations, ${sitemapStats.blogs} blogs)`,
);

import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getLocaleFromPath, LOCALES, localePath, OG_LOCALE, type Locale } from '@/i18n/locales';
import { buildOrganizationSchema, SITE_URL, site } from '@/seo/schema';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  canonical?: string;
  keywords?: string;
}

const SEO = ({
  title = 'Berg Rent a Car | Antalya & Alanya Araç Kiralama',
  description = 'Berg Rent a Car ile Antalya, Alanya ve Türkiye genelinde araç kiralama. Şeffaf fiyat, geniş filo, havalimanı teslim.',
  image = site.image,
  type = 'website',
  noindex = false,
  canonical,
  keywords,
}: SEOProps) => {
  const location = useLocation();
  const locale = getLocaleFromPath();
  const routePath = location.pathname || '/';
  const currentUrl = canonical || `${SITE_URL}${localePath(locale, routePath)}`;
  const metaDescription =
    description.length > 160 ? `${description.substring(0, 157)}...` : description;
  const schemaJson = JSON.stringify(buildOrganizationSchema());

  return (
    <Helmet prioritizeSeoTags>
      <html lang={locale} />
      <title>{title}</title>
      <meta name="description" content={metaDescription} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta name="author" content={site.name} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      {!noindex && <link rel="canonical" href={currentUrl} />}
      {!noindex &&
        LOCALES.map((code: Locale) => (
          <link
            key={code}
            rel="alternate"
            hrefLang={code}
            href={`${SITE_URL}${localePath(code, routePath)}`}
          />
        ))}
      {!noindex && (
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${SITE_URL}${localePath('tr', routePath)}`}
        />
      )}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:locale" content={OG_LOCALE[locale]} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />
      <script type="application/ld+json">{schemaJson}</script>
    </Helmet>
  );
};

export default SEO;

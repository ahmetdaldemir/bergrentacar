import site from './site.json';

export const SITE_URL = site.siteUrl.replace(/\/$/, '');

export function buildOrganizationSchema() {
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
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '00:00',
      closes: '23:59',
    },
    sameAs: site.sameAs,
    areaServed: {
      '@type': 'Country',
      name: 'Turkey',
    },
  };
}

export { site };

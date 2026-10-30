import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Destination } from "@/types";
import { useTranslation } from "@/contexts/TranslationContext";
import { useDestinations } from "@/contexts/DestinationsContext";
import { getApiAssetUrl } from "@/config/api";
import SEO from "@/components/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchForm from "@/components/SearchForm";
import { Link } from "react-router-dom";

const DestinationDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentLanguage, t } = useTranslation();
  const { getCachedDestinations, loading: destinationsLoading } = useDestinations();
  const [destination, setDestination] = useState<Destination | null>(null);

  const cachedList = useMemo(
    () => (currentLanguage?.id ? getCachedDestinations(currentLanguage.id) : null),
    [currentLanguage?.id, getCachedDestinations]
  );

  useEffect(() => {
    if (!slug || !currentLanguage?.id) return;
    const list = cachedList ?? [];
    const activeDestinations = list.filter((dest) => dest.isActive !== false);
    const foundDestination = activeDestinations.find((dest: Destination) => {
      // Match by destination id (e.g. /destination/32c2ab34-794a-4f41-a958-bb11c7c2b1e2)
      if (dest.id === slug) return true;
      // Match by translation slug
      if (dest.translations && dest.translations.length > 0) {
        const currentLangTranslation = dest.translations.find(
          (tr) => tr.language?.id === currentLanguage?.id
        );
        if (currentLangTranslation?.slug === slug) return true;
        return dest.translations.some((tr) => tr.slug === slug);
      }
      return false;
    });
    if (foundDestination) {
      setDestination(foundDestination);
    } else if (cachedList !== null) {
      setDestination(null);
      navigate("/", { replace: true });
    }
  }, [slug, currentLanguage?.id, cachedList, navigate]);

  const loading = destinationsLoading || (currentLanguage?.id && cachedList === null);

  // Get destination name from translations
  const getDestinationName = useCallback((destination: Destination): string => {
    if (destination.translations && destination.translations.length > 0) {
      const translation = destination.translations.find(
        (t) => t.language?.id === currentLanguage?.id
      );
      if (translation?.name) return translation.name;
      // Fallback to first translation if current language not found
      if (destination.translations[0]?.name) return destination.translations[0].name;
    }
    return 'Destination';
  }, [currentLanguage?.id]);

  // Get image URL - use destination name if image is missing
  const getDestinationImage = useCallback((destination: Destination): string => {
    if (destination.image) return getApiAssetUrl(destination.image);
    return '/hero-bg.png';
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('destinations.loading') || 'Loading...'}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('destinations.loading') || 'Loading...'}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Find translation for current language
  const translation = destination.translations.find(
    (t) => t.language?.id === currentLanguage?.id
  ) || destination.translations[0];

  // Parse value JSON if it exists
  let description = "";
  let shortDescription = "";
  try {
    if (translation?.value) {
      const parsed = JSON.parse(translation.value);
      description = parsed.description || "";
      shortDescription = parsed.shortDescription || "";
    }
  } catch (e) {
    // If parsing fails, use value as is
    description = translation?.value || "";
  }

  const destinationName = getDestinationName(destination);
  const destinationImage = getDestinationImage(destination);

  // Prepare SEO data
  const seoTitle = `${destinationName} - Car Rental | Berg Rent a Car`;
  const seoDescription = shortDescription 
    ? `${shortDescription.substring(0, 150)}... - Rent a car in ${destinationName} with Berg Rent a Car. Best prices and quality service.`
    : `Rent a car in ${destinationName} with Berg Rent a Car. Best prices, quality service, wide vehicle fleet.`;
  const seoImage = destinationImage;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        image={seoImage}
        type="article"
        keywords={`car rental ${destinationName}, rent a car ${destinationName}, ${destinationName} car rental, berg rent a car ${destinationName}`}
      />
      <Header />

      {/* Hero Section with Destination Image and Search Form */}
      <section className="relative bg-gray-900 text-white py-12 md:py-20 min-h-[600px] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${destinationImage}')`,
          }}
        >
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        <div className="relative container mx-auto px-4 z-10">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center gap-2 text-white/80">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  {t('footer.home') || 'Anasayfa'}
                </Link>
              </li>
              <li className="text-white/50">/</li>
              <li>
                <Link to="/destinations" className="hover:text-white transition-colors">
                  {t('destinations.title') || 'Destinations'}
                </Link>
              </li>
              <li className="text-white/50">/</li>
              <li className="text-white">{destinationName}</li>
            </ol>
          </nav>

          {/* Title and Subtitle */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
              {destinationName} {t('destinations.carRental') || 'Araç Kiralama'}
            </h1>
            {shortDescription && (
              <p className="text-lg sm:text-xl text-white/90 max-w-3xl">
                {shortDescription}
              </p>
            )}
          </div>

          {/* Search Form - White Card on Top */}
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full">
            <SearchForm 
              variant="detailPage" 
              defaultLocation={destinationName}
              defaultLocationId={destination.rentacarLocationId || null}
            />
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          {/* Prices Section */}
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
              {destinationName} {t('destinations.carRentalPrices') || 'Araç Kiralama Fiyatları'}
            </h2>
            <div className="prose max-w-none text-gray-700 leading-relaxed">
              <p className="mb-4">
                {t('destinations.priceInfo1') || 'Araç kiralama fiyatları, araç özellikleri, model, kiralama süresi ve ekstra özellikler gibi faktörlere göre değişiklik göstermektedir.'}
              </p>
              <p className="mb-4">
                {t('destinations.priceInfo2') || 'Günlük fiyatlar için web sitemizi ziyaret edebilir, uzun süreli kiralama fiyatları için müşteri temsilcilerimizle iletişime geçebilirsiniz.'}
              </p>
              <p>
                {t('destinations.priceInfo3') || 'Berg Rent a Car olarak, uygun fiyat ve güvenilir hizmet anlayışı ile müşterilerimize en iyi deneyimi sunmaktayız.'}
              </p>
            </div>
          </div>

          {/* General Information Section */}
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
              {destinationName} {t('destinations.generalInfo') || 'Genel Bilgiler'}
            </h2>
            <div className="prose max-w-none text-gray-700 leading-relaxed">
              {description ? (
                <div className="whitespace-pre-wrap">
                  {description}
                </div>
              ) : (
                <p>
                  {t('destinations.generalInfoText') || `${destinationName}, Türkiye'nin önemli destinasyonlarından biridir. Modern altyapısı ve geniş hizmet ağı ile araç kiralama hizmetleri sunmaktadır.`}
                </p>
              )}
            </div>
          </div>

          {/* Location Section */}
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
              {destinationName} {t('destinations.where') || 'Nerede?'}
            </h2>
            <div className="prose max-w-none text-gray-700 leading-relaxed">
              <p className="mb-4">
                {t('destinations.locationInfo') || `${destinationName} konumu hakkında detaylı bilgi için müşteri hizmetlerimizle iletişime geçebilirsiniz.`}
              </p>
              <p>
                {t('destinations.locationInfo2') || 'Havalimanı araç kiralama hizmetlerimiz sayesinde, varışınızda hemen araç teslim alabilir ve seyahatinize başlayabilirsiniz.'}
              </p>
            </div>
          </div>

          {/* Best Deals Section */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
              {destinationName} {t('destinations.bestDeals') || 'En Uygun Araç Kiralama'}
            </h2>
            <div className="prose max-w-none text-gray-700 leading-relaxed">
              <p className="mb-4">
                {t('destinations.bestDealsText') || 'Berg Rent a Car olarak, geniş araç filomuz ve uygun fiyatlarımız ile size en iyi araç kiralama deneyimini sunuyoruz.'}
              </p>
              <p>
                {t('destinations.bestDealsText2') || 'Benzinli, dizel, otomatik ve manuel vitesli araçlar dahil olmak üzere geniş bir araç yelpazesi arasından seçim yapabilirsiniz.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DestinationDetail;


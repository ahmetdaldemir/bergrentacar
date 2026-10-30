import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Destination } from '@/types';
import { getApiAssetUrl } from '@/config/api';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDestinations } from '@/contexts/DestinationsContext';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const AllDestinations = () => {
  const { t, currentLanguage } = useTranslation();
  const { getCachedDestinations, loading } = useDestinations();
  const [page, setPage] = useState(1);
  const observerTarget = useRef<HTMLDivElement>(null);

  const rawList = useMemo(
    () => (currentLanguage?.id ? getCachedDestinations(currentLanguage.id) : null),
    [currentLanguage?.id, getCachedDestinations]
  );
  const activeDestinations = useMemo(
    () => (rawList ? rawList.filter((d) => d.isActive === true) : []),
    [rawList]
  );
  const destinations = useMemo(
    () => activeDestinations.slice(0, page * ITEMS_PER_PAGE),
    [activeDestinations, page]
  );
  const hasMore = page * ITEMS_PER_PAGE < activeDestinations.length;

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

  // Get destination slug from translations
  const getDestinationSlug = useCallback((destination: Destination): string => {
    if (destination.translations && destination.translations.length > 0) {
      const translation = destination.translations.find(
        (t) => t.language?.id === currentLanguage?.id
      );
      if (translation?.slug) return translation.slug;
      // Fallback to first translation if current language not found
      if (destination.translations[0]?.slug) return destination.translations[0].slug;
    }
    // Fallback to id if no slug found
    return destination.id;
  }, [currentLanguage?.id]);

  // Get image URL - use destination name if image is missing
  const getDestinationImage = useCallback((destination: Destination): string => {
    if (destination.image) return getApiAssetUrl(destination.image);
    return '/hero-bg.png';
  }, []);

  // Reset page when language changes
  useEffect(() => {
    setPage(1);
  }, [currentLanguage?.id]);

  // Infinite scroll: load more when reaching the trigger
  const loadingMore = false;
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t('destinations.allDestinationsTitle') || 'Tüm Destinations | Berg Rent a Car'}
        description={t('destinations.allDestinationsDescription') || 'Tüm destinations listesi'}
        keywords={t('destinations.allDestinationsKeywords') || 'destinations, rotalar, araç kiralama'}
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            {t('destinations.allDestinations') || 'Tüm Destinations'}
          </h1>
        </div>

        {/* Loading State */}
        {loading && destinations.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-300 w-full h-48 rounded-lg"></div>
                <div className="h-4 bg-gray-300 rounded mt-2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Destinations Grid */}
        {destinations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {destinations.map((destination) => (
              <Link
                key={destination.id}
                to={`/destination/${getDestinationSlug(destination)}`}
                className="block relative group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-lg">
                  <img 
                    src={getDestinationImage(destination)}
                    alt={getDestinationName(destination)}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      // Fallback to a generic travel image if Unsplash also fails
                      e.currentTarget.src = '/hero-bg.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent rounded-lg flex items-end">
                    <h3 className="text-white text-xl font-bold p-4 w-full">
                      {getDestinationName(destination)}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        <div ref={observerTarget} className="h-4" />

        {/* End of List */}
        {!hasMore && destinations.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>{t('destinations.noMoreDestinations') || 'Tüm destinations gösterildi'}</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AllDestinations;


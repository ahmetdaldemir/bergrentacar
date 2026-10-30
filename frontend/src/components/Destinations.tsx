import { useNavigate } from 'react-router-dom';
import { Destination } from '@/types';
import { getApiAssetUrl } from '@/config/api';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDestinations } from '@/contexts/DestinationsContext';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Destinations = () => {
  const { t, currentLanguage } = useTranslation();
  const navigate = useNavigate();
  const { getCachedDestinations, loading } = useDestinations();
  const rawList = currentLanguage?.id ? getCachedDestinations(currentLanguage.id) : null;
  const destinations = rawList
    ? rawList.filter((d) => d.isActive === true).slice(0, 12)
    : [];

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
              {t('destinations.title') || 'Popüler Rotalar'}
            </h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse flex-shrink-0 w-[280px]">
                <div className="bg-gray-300 w-full h-48 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }


  if (destinations.length === 0) {
    return null;
  }

  // Get destination name from translations
  const getDestinationName = (destination: Destination): string => {
    if (destination.translations && destination.translations.length > 0) {
      const translation = destination.translations.find(
        (t) => t.language?.id === currentLanguage?.id
      );
      if (translation?.name) return translation.name;
      // Fallback to first translation if current language not found
      if (destination.translations[0]?.name) return destination.translations[0].name;
    }
    return 'Destination';
  };

  // Get destination slug from translations
  const getDestinationSlug = (destination: Destination): string => {
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
  };

  // Get image URL - use destination name if image is missing
  const getDestinationImage = (destination: Destination): string => {
    if (destination.image) return getApiAssetUrl(destination.image);
    return '/hero-bg.png';
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
            {t('destinations.title') || 'Popüler Rotalar'}
          </h2>
          <Link to="/destinations">
            <Button variant="outline" className="whitespace-nowrap">
              {t('destinations.viewAll') || 'Tüm Destinations'}
            </Button>
          </Link>
        </div>
        
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {destinations.map((destination) => (
              <CarouselItem key={destination.id} className="pl-2 md:pl-4 basis-auto">
                <Link
                  to={`/destination/${getDestinationSlug(destination)}`}
                  className="block relative group cursor-pointer w-[280px]"
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <img 
                      src={getDestinationImage(destination)}
                      alt={getDestinationName(destination)}
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        // Fallback to a generic travel image if Unsplash also fails
                        const destinationName = getDestinationName(destination);
                        const encodedName = encodeURIComponent(destinationName);
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
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12" />
          <CarouselNext className="hidden md:flex -right-12" />
        </Carousel>
      </div>
    </section>
  );
};

export default Destinations;
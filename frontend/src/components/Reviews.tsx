import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  fetchGooglePlaceReviews,
  hasGoogleReviewsConfig,
  type GooglePlaceReviews,
  type GoogleReview,
} from '@/lib/googleReviews';

const ReviewCard = ({
  review,
  ratingLabel,
}: {
  review: GoogleReview;
  ratingLabel: string;
}) => (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
    <div className="bg-blue-900 text-white px-4 py-3">
      <h3 className="font-semibold text-sm">{ratingLabel}</h3>
    </div>
    <div className="p-4 bg-white">
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < Math.round(review.rating)
                ? "text-green-500 fill-green-500"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
      <p className="text-gray-700 text-sm mb-4 leading-relaxed line-clamp-5">
        "{review.text}"
      </p>
      {review.relativeTime && (
        <p className="text-xs text-gray-500">{review.relativeTime}</p>
      )}
    </div>
  </div>
);

const Reviews = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<GooglePlaceReviews | null>(null);
  const [loading, setLoading] = useState(hasGoogleReviewsConfig());

  useEffect(() => {
    if (!hasGoogleReviewsConfig()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchGooglePlaceReviews()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!hasGoogleReviewsConfig() || (!loading && (!data || data.reviews.length === 0))) {
    return null;
  }

  const reviews = data?.reviews.slice(0, 4) || [];

  return (
    <section className="py-16" style={{ backgroundColor: 'aliceblue'}}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
          <div className="flex items-start gap-6 mb-6 md:mb-0">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('reviews.satisfaction')}</p>
              <p className="text-sm text-gray-600">
                {(data?.total || 0).toLocaleString()} {t('reviews.reviews')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-16 h-16 bg-green-500 rounded-full">
                <Star className="w-8 h-8 text-white fill-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? '—' : `${(data?.rating || 0).toFixed(1)}/5`}
                </p>
              </div>
            </div>
          </div>
          <div className="md:text-right">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t('reviews.experiences')}
            </h2>
            {data?.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-700 hover:underline mt-2 inline-block"
              >
                {t('reviews.viewOnGoogle')}
              </a>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg h-56 border border-gray-200" />
            ))}
          </div>
        ) : (
          <>
            <div className="md:hidden">
              <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-2">
                  {reviews.map((review) => (
                    <CarouselItem key={`${review.authorName}-${review.relativeTime}`} className="pl-2 basis-auto">
                      <div className="w-[280px]">
                        <ReviewCard
                          review={review}
                          ratingLabel={`${t('reviews.ratingOf')} ${review.authorName}`}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>

            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {reviews.map((review) => (
                <ReviewCard
                  key={`${review.authorName}-${review.relativeTime}`}
                  review={review}
                  ratingLabel={`${t('reviews.ratingOf')} ${review.authorName}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Reviews;

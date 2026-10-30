/// <reference path="../types/google-maps.d.ts" />
import { getLocaleFromPath } from '@/i18n/locales';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';

export type GoogleReview = {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
  profilePhotoUrl?: string;
  authorUrl?: string;
};

export type GooglePlaceReviews = {
  name: string;
  rating: number;
  total: number;
  url?: string;
  reviews: GoogleReview[];
};

export function hasGoogleReviewsConfig(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_PLACE_ID);
}

export async function fetchGooglePlaceReviews(): Promise<GooglePlaceReviews | null> {
  const placeId = import.meta.env.VITE_GOOGLE_PLACE_ID;
  if (!hasGoogleReviewsConfig() || !placeId) return null;

  await loadGoogleMaps(getLocaleFromPath());

  if (typeof google === 'undefined' || !google.maps?.places?.PlacesService) {
    return null;
  }

  return new Promise((resolve) => {
    const attribution = document.createElement('div');
    const service = new google.maps.places.PlacesService(attribution);
    service.getDetails(
      {
        placeId,
        fields: ['name', 'rating', 'user_ratings_total', 'reviews', 'url'],
        language: getLocaleFromPath(),
      },
      (place, status) => {
                if (status !== 'OK' || !place) {
          resolve(null);
          return;
        }

        resolve({
          name: place.name || 'Berg Rent A Car',
          rating: place.rating || 0,
          total: place.user_ratings_total || 0,
          url: place.url,
          reviews: (place.reviews || [])
            .filter((review) => review.text && review.rating)
            .map((review) => ({
              authorName: review.author_name || '',
              rating: review.rating || 0,
              text: review.text || '',
              relativeTime: review.relative_time_description || '',
              profilePhotoUrl: review.profile_photo_url,
              authorUrl: review.author_url,
            })),
        });
      },
    );
  });
}

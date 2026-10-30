// Google Maps API types declaration
declare namespace google {
  namespace maps {
    enum TravelMode {
      DRIVING = 'DRIVING',
      WALKING = 'WALKING',
      BICYCLING = 'BICYCLING',
      TRANSIT = 'TRANSIT'
    }

    enum UnitSystem {
      METRIC = 0,
      IMPERIAL = 1
    }

    interface LatLng {
      lat(): number;
      lng(): number;
    }

    namespace places {
      enum PlacesServiceStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        INVALID_REQUEST = 'INVALID_REQUEST',
        NOT_FOUND = 'NOT_FOUND',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR',
      }

      interface PlaceReview {
        author_name?: string;
        author_url?: string;
        language?: string;
        profile_photo_url?: string;
        rating?: number;
        relative_time_description?: string;
        text?: string;
        time?: number;
      }

      interface PlaceResult {
        place_id?: string;
        name?: string;
        formatted_address?: string;
        rating?: number;
        user_ratings_total?: number;
        url?: string;
        reviews?: PlaceReview[];
        address_components?: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
        geometry?: {
          location?: LatLng;
        };
        types?: string[];
      }

      interface PlaceDetailsRequest {
        placeId: string;
        fields?: string[];
        language?: string;
      }

      interface AutocompleteOptions {
        types?: string[];
        componentRestrictions?: { country: string | string[] };
        fields?: string[];
      }

      class Autocomplete {
        constructor(input: HTMLInputElement, options?: AutocompleteOptions);
        addListener(eventName: string, handler: () => void): void;
        getPlace(): PlaceResult;
      }

      class PlacesService {
        constructor(attrContainer: HTMLDivElement | HTMLElement);
        getDetails(
          request: PlaceDetailsRequest,
          callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void
        ): void;
      }
    }

    interface DistanceMatrixRequest {
      origins: (LatLng | string)[];
      destinations: (LatLng | string)[];
      travelMode: TravelMode;
      unitSystem: UnitSystem;
    }

    interface DistanceMatrixResponse {
      rows: Array<{
        elements: Array<{
          status: string;
          distance: {
            text: string;
            value: number;
          };
          duration: {
            text: string;
            value: number;
          };
        }>;
      }>;
    }

    type DistanceMatrixStatus = string;

    class DistanceMatrixService {
      getDistanceMatrix(
        request: DistanceMatrixRequest,
        callback: (response: DistanceMatrixResponse | null, status: DistanceMatrixStatus) => void
      ): void;
    }

    namespace event {
      function clearInstanceListeners(instance: any): void;
    }
  }
}

export {};

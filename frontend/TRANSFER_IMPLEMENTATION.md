# Transfer Search Implementation

## Overview

This document describes the implementation of the transfer search functionality in the Joyride Now application. The transfer search allows users to search for available transfer services between airports, hotels, and other locations.

## API Endpoints

### GET /api/transfer/public/locations

**Description:** Fetch available pickup and dropoff locations for transfer services.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant ID (automatically added by the API service) |

**Example Request:**

```
GET /api/transfer/public/locations?tenantId=9930c947-f720-463c-ba1d-e1af921d5ffb
```

**Response Structure:**

```json
{
  "pickupLocations": [
    {
      "id": "fe38cb24-3518-4fc5-b98b-673440521c61",
      "name": "Antalya Airport",
      "type": "airport",
      "address": null,
      "latitude": "36.9012",
      "longitude": "30.7928"
    },
    {
      "id": "ed50adfc-27b6-4fc0-b401-8cff89388354",
      "name": "IST Airport",
      "type": "airport",
      "address": null,
      "latitude": "41.2753",
      "longitude": "28.7519"
    }
  ],
  "dropoffLocations": [
    {
      "id": "fe962fa1-aac6-4495-9a2e-167ccbac9ef6",
      "name": "Istanbul City Center",
      "type": "city_center",
      "address": null,
      "latitude": "41.0082",
      "longitude": "28.9784"
    },
    {
      "id": "1740958f-8991-4210-ab4a-da954032a2c5",
      "name": "Lara Beach Hotel",
      "type": "hotel",
      "address": null,
      "latitude": "36.8563",
      "longitude": "30.8397"
    }
  ]
}
```

### GET /api/transfer/public/search

**Description:** Search for available transfer vehicles and routes based on search criteria.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `tenantId` | string | Yes | - | Tenant ID (automatically added by the API service) |
| `languageId` | string | No | - | Language ID for localized content |
| `originType` | string | Yes | - | Origin location type: `'airport'`, `'hotel'`, or `'location'` |
| `originId` | string | Yes | - | Origin location ID |
| `destinationType` | string | Yes | - | Destination location type: `'airport'`, `'hotel'`, or `'location'` |
| `destinationId` | string | Yes | - | Destination location ID |
| `transferDate` | string | Yes | - | Transfer date in format `YYYY-MM-DD` |
| `transferTime` | string | No | `'10:00'` | Transfer time in format `HH:mm` |
| `passengerCount` | number | No | `1` | Number of passengers |
| `isRoundTrip` | boolean | No | `false` | Whether the transfer is round-trip |
| `currencyId` | string | No | - | Currency ID for pricing |

**Example Request:**

```
GET /api/transfer/public/search?tenantId=9930c947-f720-463c-ba1d-e1af921d5ffb&originType=airport&originId=123&destinationType=hotel&destinationId=456&transferDate=2024-01-15&transferTime=14:30&passengerCount=4&isRoundTrip=false
```

**Response Structure:**

```typescript
{
  "transfers": [
    {
      "route": {
        "id": "uuid",
        "name": "IST Airport → Marmaris Hotel",
        "type": "airport_hotel",
        "distance": 120,
        "averageDuration": 180,
        "points": []
      },
      "vehicle": {
        "id": "uuid",
        "name": "Mercedes Vito",
        "type": "van",
        "capacity": 8,
        "luggage": 6,
        "images": ["image-url-1", "image-url-2"],
        "description": "Comfortable van with air conditioning",
        "features": ["Air Conditioning", "WiFi", "USB Charging"]
      },
      "pricing": {
        "basePrice": 150.00,
        "totalPrice": 150.00,
        "currencyCode": "EUR",
        "isNightRate": false,
        "isRoundTrip": false,
        "extraServicePrices": {}
      }
    }
  ],
  "searchParams": {
    "tenantId": "9930c947-f720-463c-ba1d-e1af921d5ffb",
    "originType": "airport",
    "originId": "123",
    "destinationType": "hotel",
    "destinationId": "456",
    "transferDate": "2024-01-15",
    "transferTime": "14:30",
    "passengerCount": 4,
    "isRoundTrip": false
  }
}
```

## Implementation Files

### 1. Type Definitions

**File:** `src/types/transfer.ts`

Defines TypeScript interfaces for transfer-related data:

- `TransferRoute` - Route information including distance and duration
- `TransferVehicle` - Vehicle details including capacity and features
- `TransferPricing` - Pricing information including base price and currency
- `Transfer` - Complete transfer object combining route, vehicle, and pricing
- `TransferSearchParams` - Search parameters interface
- `TransferSearchResponse` - API response interface

### 2. API Service

**Files:** 
- `src/services/api.ts`
- `mobil/src/services/api.ts` (mobile version)

Added two methods to the API service:

#### `getTransferLocations()`
Fetches available pickup and dropoff locations for transfer services.
- No parameters required (tenantId is automatically added)
- Returns separate arrays for pickup and dropoff locations
- Locations include id, name, type, address, and coordinates

**Usage Example:**

```typescript
import { api } from '@/services/api';

const locations = await api.getTransferLocations();
// Response: { pickupLocations: [...], dropoffLocations: [...] }
```

#### `searchTransfers(searchParams)`
Searches for available transfers based on search criteria.
- Accepts search parameters
- Builds query string with proper encoding
- Handles optional parameters with defaults
- Automatically includes tenant ID
- Returns typed response

**Usage Example:**

```typescript
import { api } from '@/services/api';

const results = await api.searchTransfers({
  originType: 'airport',
  originId: '123',
  destinationType: 'hotel',
  destinationId: '456',
  transferDate: '2024-01-15',
  transferTime: '14:30',
  passengerCount: 4,
  languageId: currentLanguage?.id,
  currencyId: selectedCurrency?.id,
});
```

### 3. Search Form Component

**File:** `src/components/SearchForm.tsx`

#### Location Loading
Added a dedicated `useEffect` hook to fetch transfer locations:
- Fetches from `/api/transfer/public/locations` endpoint
- Loads locations when user switches to the transfer tab
- Implements caching with localStorage (24-hour cache)
- Maps API response to component format (name → title)
- Stores pickup and dropoff locations separately
- Handles errors gracefully with fallback to cached data

**Location Data Flow:**
1. User switches to transfer tab
2. Component checks localStorage for cached locations (valid for 24 hours)
3. If cache is valid, uses cached data
4. If cache is missing/expired, fetches from API
5. API returns separate `pickupLocations` and `dropoffLocations` arrays
6. Data is mapped to component format and stored in state
7. Locations are displayed in dropdown menus

#### Search Handler
Updated `handleTransferSearch` function to:
- Validate required fields
- Validate that the date is not in the past
- Map location types to API format (handles various type formats)
- Build search URL with query parameters
- Navigate to transfer search results page

**Location Type Mapping:**
- `'airport'` or `'havalimani'` → `'airport'`
- `'hotel'` or `'otel'` → `'hotel'`
- Other types → `'location'`

### 4. Transfer Search Results Page

**File:** `src/pages/TransferSearch.tsx`

A complete React component that:
- Extracts search parameters from URL
- Fetches transfer results from API
- Displays search summary
- Shows available transfers in card format
- Handles empty results gracefully
- Supports multiple languages
- Includes vehicle images, capacity, features
- Shows route details (distance, duration)
- Provides booking functionality

**Features:**
- Responsive design with Tailwind CSS
- Loading state with animated spinner
- Error handling with toast notifications
- Vehicle type badges
- Night rate and round-trip indicators
- Image fallback handling
- Detailed vehicle information
- "Book Now" button for each transfer

### 5. Routing

**File:** `src/App.tsx`

Added route for transfer search:

```typescript
<Route path="/transfer/search" element={<TransferSearch />} />
```

### 6. Translations

Added transfer-specific translations to all locale files:

**Files:**
- `src/locales/en.json` (English)
- `src/locales/tr.json` (Turkish)
- `src/locales/de.json` (German)
- `src/locales/ru.json` (Russian)
- `src/locales/sv.json` (Swedish)
- `src/locales/da.json` (Danish)

**Translation Keys:**

```json
{
  "transfer": {
    "from": "From",
    "to": "To",
    "date": "Date",
    "time": "Time",
    "passengers": "Passengers",
    "luggage": "Luggage",
    "availableTransfers": "Available Transfers",
    "selectYourTransfer": "Select your preferred transfer option",
    "noResults": "No Transfers Found",
    "noResultsDescription": "We couldn't find any transfers for your search criteria...",
    "vehicleTypes": {
      "sedan": "Sedan",
      "van": "Van",
      "minibus": "Minibus",
      "bus": "Bus",
      "luxury": "Luxury"
    },
    "nightRate": "Night Rate",
    "roundTrip": "Round Trip",
    "routeDetails": "Route Details",
    "duration": "Duration",
    "distance": "Distance",
    "vehicleCapacity": "Vehicle Capacity",
    "description": "Description",
    "features": "Features",
    "bookNow": "Book Now"
  }
}
```

## User Flow

1. **Search Form:** User enters transfer search criteria on the home page
   - Select pickup location (airport/hotel/location)
   - Select drop-off location (airport/hotel/location)
   - Select transfer date
   - Select transfer time
   - Select number of passengers

2. **Validation:** Form validates:
   - All required fields are filled
   - Date is not in the past
   - Valid location selections

3. **Search:** On form submission:
   - Build search URL with query parameters
   - Navigate to `/transfer/search` page

4. **Results Page:** Display search results
   - Show search summary at top
   - List available transfers
   - Each transfer shows:
     - Vehicle name and type
     - Vehicle images
     - Capacity (passengers and luggage)
     - Route details (distance, duration)
     - Price information
     - Features and description
   - Empty state if no results found

5. **Booking:** User clicks "Book Now"
   - TODO: Implement booking flow
   - Currently shows toast notification

## Testing

To test the transfer search functionality:

1. **Navigate to Home Page:**
   ```
   http://localhost:5173/
   ```

2. **Switch to Transfer Tab** in the search form

3. **Fill in Search Criteria:**
   - Pickup Location: Select an airport/hotel
   - Drop-off Location: Select a hotel/location
   - Transfer Date: Select a future date
   - Transfer Time: Select a time (default: 10:00)
   - Passengers: Select number (default: 1)

4. **Click "Search Transfer" Button**

5. **View Results** at:
   ```
   http://localhost:5173/transfer/search?originType=airport&originId=123&...
   ```

## Next Steps

The following features are planned for future implementation:

1. **Booking Flow:**
   - Create transfer booking form
   - Handle booking confirmation
   - Send confirmation emails

2. **Filters and Sorting:**
   - Filter by vehicle type
   - Filter by price range
   - Sort by price, capacity, duration

3. **Additional Features:**
   - Return trip selection for round trips
   - Extra services (child seats, extra luggage, etc.)
   - Driver contact information
   - Real-time availability checking

4. **Mobile Optimization:**
   - Implement transfer search in mobile app
   - Add transfer-specific mobile screens
   - Optimize UI for mobile devices

## API Integration Notes

- The API endpoint is called via the `api.searchTransfers()` method
- Authentication token is automatically included if available
- Tenant ID is automatically added from config
- All dates should be in `YYYY-MM-DD` format
- All times should be in `HH:mm` format (24-hour)
- Location IDs should be strings or numbers
- Location types must be one of: `'airport'`, `'hotel'`, `'location'`

## Error Handling

The implementation includes comprehensive error handling:

1. **Form Validation Errors:**
   - Missing required fields
   - Invalid date selection
   - Toast notifications for user feedback

2. **API Errors:**
   - Network errors
   - Invalid response format
   - Empty results
   - Display error messages with toast notifications

3. **UI States:**
   - Loading state with spinner
   - Empty state with helpful message
   - Error state with retry option

## Performance Considerations

- Images are loaded with fallback handling
- API calls are made only when necessary
- Results are cached during the session
- Responsive design optimizes for all screen sizes
- Loading states prevent multiple simultaneous requests

## Browser Support

The implementation is compatible with:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

No additional dependencies were required. The implementation uses existing libraries:
- React Router for navigation
- Tailwind CSS for styling
- shadcn/ui components
- date-fns for date formatting
- lucide-react for icons

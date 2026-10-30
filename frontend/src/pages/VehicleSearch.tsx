import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { format, parseISO } from "date-fns";
import { calculateCalendarRentalDays, calculateRentalDays } from "@/utils/rentalDays";
import { tr } from "date-fns/locale";
import { 
  Edit2, ChevronDown, Star, 
  Fuel, Settings, Calendar, MapPin, Users, Luggage, DoorOpen, Info
} from "lucide-react";
import EditSearchModal from "@/components/EditSearchModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { api } from "@/services/api";
import { Vehicle, VehicleFilter } from "@/types/vehicle";
import { Extra } from "@/types/extra";
import { getApiAssetUrl } from "@/config/api";
import { PickupLocation, Currency } from "@/types";
import ReservationModal from "@/components/ReservationModal";
import LoadingGif from "@/components/LoadingGif";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function applyVehicleSearchFilters(vehicles: Vehicle[], filters: VehicleFilter): Vehicle[] {
  let list = [...vehicles];
  const norm = (s: string | undefined) => (s || "").toString().toLowerCase().trim();

  if (filters.segment) {
    const seg = norm(filters.segment);
    list = list.filter((v) => {
      const cat = v.category;
      const catId =
        typeof cat === "object" && cat != null && "id" in cat
          ? String((cat as { id: string }).id)
          : "";
      const catName =
        typeof cat === "object" && cat != null && "name" in cat
          ? String((cat as { name: string }).name)
          : "";
      const segField = norm(v.segment);
      const catNameStr = norm(v.categoryName);
      const catStr = typeof cat === "string" ? norm(cat) : "";
      return (
        segField === seg ||
        catId === seg ||
        norm(catName).includes(seg) ||
        catNameStr.includes(seg) ||
        catStr.includes(seg)
      );
    });
  }

  if (filters.transmission) {
    const tr = norm(filters.transmission);
    list = list.filter((v) => norm(String(v.transmission || "")).includes(tr));
  }

  if (filters.fuelType) {
    const f = norm(filters.fuelType);
    list = list.filter((v) => norm(String(v.fuelType || "")).includes(f));
  }

  if (filters.vehicleType) {
    const vt = norm(filters.vehicleType);
    list = list.filter((v) => norm(String(v.name || "")).includes(vt));
  }

  const sortBy = filters.sortBy;
  if (sortBy === "price-asc") {
    list.sort(
      (a, b) =>
        (a.dailyPrice ?? a.totalPrice ?? 0) - (b.dailyPrice ?? b.totalPrice ?? 0)
    );
  } else if (sortBy === "price-desc") {
    list.sort(
      (a, b) =>
        (b.dailyPrice ?? b.totalPrice ?? 0) - (a.dailyPrice ?? a.totalPrice ?? 0)
    );
  } else if (sortBy === "name-asc") {
    list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  } else if (sortBy === "name-desc") {
    list.sort((a, b) => String(b.name).localeCompare(String(a.name)));
  }

  return list;
}

const VehicleSearch = () => {
  const { t, currentLanguage } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VehicleFilter>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeOpen, setPromoCodeOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [selectedVehicleForDetails, setSelectedVehicleForDetails] = useState<Vehicle | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  
  // Search parameters from URL
  const pickupLocationId = searchParams.get('pickupLocationId');
  const dropoffLocationId = searchParams.get('dropoffLocationId');
  const pickupDate = searchParams.get('pickupDate');
  const dropoffDate = searchParams.get('dropoffDate');
  const pickupTime = searchParams.get('pickupTime') || '10:00';
  const dropoffTime = searchParams.get('dropoffTime') || '10:00';
  const currencyId = searchParams.get('currencyId') || localStorage.getItem('selectedCurrencyId') || undefined;
  const segmentFromUrl = searchParams.get('segment');
  
  const [pickupLocation, setPickupLocation] = useState<PickupLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<PickupLocation | null>(null);
  const [allLocations, setAllLocations] = useState<PickupLocation[]>([]);
  
  // State to store location data from localStorage
  const [savedLocationData, setSavedLocationData] = useState<{
    pickupLocation?: { name?: string; type?: string };
    dropoffLocation?: { name?: string; type?: string };
  } | null>(null);
  
  // Initialize filters from URL parameters (e.g., segment from category selection)
  useEffect(() => {
    if (segmentFromUrl) {
      setFilters(prev => ({
        ...prev,
        segment: segmentFromUrl,
      }));
    }
  }, [segmentFromUrl]);

  const calendarDays = useMemo(
    () => calculateCalendarRentalDays(pickupDate, dropoffDate),
    [pickupDate, dropoffDate]
  );

  const days = useMemo(
    () => calculateRentalDays(pickupDate, dropoffDate, pickupTime, dropoffTime),
    [pickupDate, dropoffDate, pickupTime, dropoffTime]
  );

  const pricedVehicles = useMemo(() => {
    const extraDays = Math.max(0, days - calendarDays);
    if (extraDays === 0) return vehicles;
    return vehicles.map((vehicle) => {
      const unit = vehicle.dailyPrice || (vehicle.totalPrice ? vehicle.totalPrice / calendarDays : 0);
      return {
        ...vehicle,
        totalPrice: (vehicle.totalPrice || 0) + unit * extraDays,
      };
    });
  }, [vehicles, days, calendarDays]);

  const displayedVehicles = useMemo(
    () => applyVehicleSearchFilters(pricedVehicles, filters),
    [pricedVehicles, filters]
  );

  // Fetch currencies
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const data = await api.getCurrencies();
        let currencyList: Currency[] = [];
        
        if (Array.isArray(data)) {
          currencyList = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          currencyList = data.data;
        }

        const activeCurrencies = currencyList.filter(c => c.isActive);
        setCurrencies(activeCurrencies);

        // Get selected currency from localStorage
        const savedCurrencyId = localStorage.getItem('selectedCurrencyId');
        const savedCurrency = localStorage.getItem('selectedCurrency');
        
        if (savedCurrencyId && savedCurrency) {
          try {
            const currency = JSON.parse(savedCurrency);
            if (activeCurrencies.find(c => c.id === currency.id)) {
              setSelectedCurrency(currency);
              return;
            }
          } catch {
            // Invalid saved currency, continue
          }
        }

        // If no saved currency, use first active currency
        if (activeCurrencies.length > 0) {
          setSelectedCurrency(activeCurrencies[0]);
        }
      } catch (error) {
        console.error('Error fetching currencies:', error);
      }
    };

    fetchCurrencies();
  }, []);

  // Handle currency change
  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    localStorage.setItem('selectedCurrencyId', currency.id);
    localStorage.setItem('selectedCurrency', JSON.stringify(currency));
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('currencyChanged'));
    
    // Update URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('currencyId', currency.id);
    setSearchParams(newSearchParams);
  };
  
  // Function to load location data from localStorage
  const loadLocationDataFromStorage = () => {
    try {
      const savedData = localStorage.getItem('searchLocationData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setSavedLocationData(parsed);
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 [VEHICLE_SEARCH] Loaded location data from localStorage:', parsed);
        }
      } else {
        setSavedLocationData(null);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [VEHICLE_SEARCH] Error loading location data from localStorage:', error);
      }
      setSavedLocationData(null);
    }
  };
  
  // Load location data from localStorage on component mount
  useEffect(() => {
    loadLocationDataFromStorage();
  }, []);
  
  // Reload location data when search params change (e.g., after EditSearchModal update)
  useEffect(() => {
    loadLocationDataFromStorage();
  }, [pickupLocationId, dropoffLocationId, pickupDate, dropoffDate]);
  
  // Listen for storage changes (e.g., from other tabs or EditSearchModal)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'searchLocationData') {
        loadLocationDataFromStorage();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadLocationDataFromStorage();
    };
    
    window.addEventListener('searchLocationDataUpdated', handleCustomStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('searchLocationDataUpdated', handleCustomStorageChange);
    };
  }, []);

  // Helper function to get main location ID (parent's ID if child, own ID if parent)
  // This returns the locationId that should be sent to the API (parent's locationId)
  const getMainLocationId = (location: PickupLocation | null): string | number | null => {
    if (!location) return null;
    
    // If location has a parent, return parent's ID (this is the locationId in API response)
    const hasParentId = location.parentId !== null && location.parentId !== undefined;
    const hasIdParent = location.id_parent !== null && location.id_parent !== undefined;
    
    if (hasParentId || hasIdParent) {
      // This is a child location, return parent's ID
      // The parent's ID is the locationId that should be sent to API
      return location.parentId ?? location.id_parent ?? location.id;
    }
    
    // This is already a parent location, return its own ID
    return location.id;
  };

  // Helper function to get location name - priority: localStorage > translations > name/title
  const getLocationName = (locationType: 'pickup' | 'dropoff', location: PickupLocation | null): string => {
    // First priority: Get name from localStorage
    if (savedLocationData) {
      const savedLocation = locationType === 'pickup' 
        ? savedLocationData.pickupLocation 
        : savedLocationData.dropoffLocation;
      if (savedLocation?.name) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`📍 [VEHICLE_SEARCH] Location name from localStorage (${locationType}):`, savedLocation.name);
        }
        return savedLocation.name;
      }
    }
    
    // Second priority: Get name from location object (translations or name/title)
    if (location) {
      // Try to get name from translations array (language-specific)
      if (location.translations && Array.isArray(location.translations) && currentLanguage?.id) {
        const translation = location.translations.find(
          (t) => String(t.languageId) === String(currentLanguage.id)
        );
        if (translation && translation.name) {
          return translation.name;
        }
        // If current language translation not found, try to get any translation
        if (location.translations.length > 0 && location.translations[0].name) {
          return location.translations[0].name;
        }
      }
      
      // Fallback to name or title (check both fields)
      if (location.name) return location.name;
      if (location.title) return location.title;
    }
    
    return '';
  };

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await api.getPickupLocations();
        let locations: any[] = [];
        
        if (Array.isArray(data)) {
          locations = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          locations = data.data;
        }

        // Normalize API response (similar to SearchForm)
        interface ApiLocationItem {
          id?: string | number;
          locationId?: string | number;
          location?: {
            id?: string | number;
            name?: string;
            parentId?: string | number | null;
            type?: string;
            children?: ApiLocationItem[];
          };
          name?: string;
          title?: string;
          type?: string;
          parentId?: string | number | null;
          id_parent?: string | number | null;
          children?: ApiLocationItem[];
          [key: string]: unknown;
        }

        const normalizedLocations = locations.map((item: ApiLocationItem): PickupLocation => {
          if (item.location) {
            return {
              id: item.location.id || item.id || item.locationId || 0,
              locationId: item.locationId || item.location.id || null, // Preserve locationId from top-level
              ...item.location, // location object fields (id, name, parentId, type, children)
              ...item, // Top-level fields override (id, tenantId, locationId, sort, deliveryFee, etc.)
              // Ensure name and type come from location object if available
              name: item.location.name || item.name || '',
              title: item.location.name || item.name || item.title || '',
              type: (item.location.type || item.type) as PickupLocation['type'],
              parentId: item.location.parentId ?? item.parentId ?? item.id_parent ?? null,
              // Preserve children from location object or top-level
              children: (item.location.children || item.children || []) as PickupLocation[],
              // Preserve translations
              translations: (item.location as any).translations || (item as any).translations || undefined,
            };
          }
          // If no location object, use item as is
          return {
            id: item.id || item.locationId || 0,
            locationId: item.locationId || null, // Preserve locationId
            ...item,
            name: item.name || '',
            title: item.name || item.title || '',
            type: item.type as PickupLocation['type'],
            parentId: item.parentId ?? item.id_parent ?? null,
            children: (item.children || []) as PickupLocation[],
            translations: (item as any).translations || undefined,
          } as PickupLocation;
        });
        
        // Flatten locations to find by ID (including nested children)
        // Search by both id and locationId to handle parent/child relationships
        const findLocation = (id: string | number): PickupLocation | null => {
          const searchInArray = (arr: PickupLocation[]): PickupLocation | null => {
            for (const loc of arr) {
              // Check both id and locationId fields
              if (String(loc.id) === String(id) || String(loc.locationId) === String(id)) {
                return loc;
              }
              if (loc.children && loc.children.length > 0) {
                const found = searchInArray(loc.children);
                if (found) return found;
              }
            }
            return null;
          };
          return searchInArray(normalizedLocations);
        };
        
        // Store all locations for later use
        setAllLocations(normalizedLocations);
        
        if (pickupLocationId) {
          const pickup = findLocation(pickupLocationId);
          if (pickup) {
            setPickupLocation(pickup);
          } else {
            // If not found by ID, try to find by locationId (for parent locations)
            // This handles cases where URL has parent ID but we need child location
            const pickupByLocationId = normalizedLocations.find(
              (loc) => String(loc.locationId) === String(pickupLocationId) || 
                       String(loc.id) === String(pickupLocationId)
            );
            if (pickupByLocationId) {
              setPickupLocation(pickupByLocationId);
            } else {
              // Try to find in children
              for (const loc of normalizedLocations) {
                if (loc.children) {
                  const found = loc.children.find(
                    (child) => String(child.id) === String(pickupLocationId) ||
                               String(child.locationId) === String(pickupLocationId)
                  );
                  if (found) {
                    setPickupLocation(found);
                    break;
                  }
                }
              }
            }
          }
        }
        
        if (dropoffLocationId) {
          const dropoff = findLocation(dropoffLocationId);
          if (dropoff) {
            setDropoffLocation(dropoff);
          } else {
            // If not found by ID, try to find by locationId (for parent locations)
            const dropoffByLocationId = normalizedLocations.find(
              (loc) => String(loc.locationId) === String(dropoffLocationId) || 
                       String(loc.id) === String(dropoffLocationId)
            );
            if (dropoffByLocationId) {
              setDropoffLocation(dropoffByLocationId);
            } else {
              // Try to find in children
              for (const loc of normalizedLocations) {
                if (loc.children) {
                  const found = loc.children.find(
                    (child) => String(child.id) === String(dropoffLocationId) ||
                               String(child.locationId) === String(dropoffLocationId)
                  );
                  if (found) {
                    setDropoffLocation(found);
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        // On error, clear locations to avoid showing IDs
        setPickupLocation(null);
        setDropoffLocation(null);
      }
    };
    
    if (pickupLocationId || dropoffLocationId) {
      fetchLocations();
    }
  }, [pickupLocationId, dropoffLocationId, currentLanguage?.id]);

  // Fetch vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!pickupLocationId || !dropoffLocationId || !pickupDate || !dropoffDate) {
        setLoading(false);
        return;
      }

      const effectiveLanguageId = currentLanguage?.id;
      const effectiveCurrencyId =
        localStorage.getItem("selectedCurrencyId") ||
        currencyId ||
        selectedCurrency?.id ||
        currencies[0]?.id;

      if (!effectiveLanguageId || !effectiveCurrencyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get main location IDs (parent's ID if child, own ID if parent)
        const mainPickupLocationId = pickupLocation ? getMainLocationId(pickupLocation) : pickupLocationId;
        const mainDropoffLocationId = dropoffLocation ? getMainLocationId(dropoffLocation) : dropoffLocationId;
        
        const response = await api.searchVehicles({
          pickupLocationId: mainPickupLocationId || pickupLocationId,
          dropoffLocationId: mainDropoffLocationId || dropoffLocationId,
          pickupDate,
          dropoffDate,
          languageId: effectiveLanguageId,
          currencyId: String(effectiveCurrencyId),
        });
        
        // Handle new API response structure: { vehicles: [], extras: [] }
        let vehicleList: Vehicle[] = [];
        let extrasList: Extra[] = [];
        
        if (response && typeof response === 'object') {
          if (Array.isArray(response)) {
            vehicleList = response;
          } else if (response.vehicles && Array.isArray(response.vehicles)) {
            vehicleList = response.vehicles;
          } else if (response.data && Array.isArray(response.data)) {
            vehicleList = response.data;
          }
          
          // Extract extras from response
          if (response.extras && Array.isArray(response.extras)) {
            extrasList = response.extras;
          }
        }
        
        setVehicles(vehicleList);
        setExtras(extrasList);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

      fetchVehicles();
    }, [
      pickupLocation,
      dropoffLocation,
      pickupDate,
      dropoffDate,
      pickupLocationId,
      dropoffLocationId,
      currentLanguage?.id,
      currencyId,
      currencies,
      selectedCurrency,
    ]);

  // Listen for currency changes and refetch vehicles
  useEffect(() => {
    // Only refetch if we already have search parameters (initial search was done)
    if (!pickupLocationId || !dropoffLocationId || !pickupDate || !dropoffDate) {
      return;
    }

    const handleCurrencyChange = () => {
      // Currency changed, refetch vehicles with new currencyId
      const newCurrencyId = localStorage.getItem('selectedCurrencyId');
      
      // Only refetch if currency actually changed
      if (newCurrencyId && newCurrencyId !== currencyId) {
        const fetchVehicles = async () => {
          try {
            setLoading(true);
            
            // Get main location IDs (parent's ID if child, own ID if parent)
            const mainPickupLocationId = pickupLocation ? getMainLocationId(pickupLocation) : pickupLocationId;
            const mainDropoffLocationId = dropoffLocation ? getMainLocationId(dropoffLocation) : dropoffLocationId;
            
            const langId = currentLanguage?.id;
            if (!langId) return;

            const response = await api.searchVehicles({
              pickupLocationId: mainPickupLocationId || pickupLocationId,
              dropoffLocationId: mainDropoffLocationId || dropoffLocationId,
              pickupDate,
              dropoffDate,
              languageId: langId,
              currencyId: String(newCurrencyId),
            });
            
            // Handle new API response structure: { vehicles: [], extras: [] }
            let vehicleList: Vehicle[] = [];
            let extrasList: Extra[] = [];
            
            if (response && typeof response === 'object') {
              if (Array.isArray(response)) {
                vehicleList = response;
              } else if (response.vehicles && Array.isArray(response.vehicles)) {
                vehicleList = response.vehicles;
              } else if (response.data && Array.isArray(response.data)) {
                vehicleList = response.data;
              }
              
              // Extract extras from response
              if (response.extras && Array.isArray(response.extras)) {
                extrasList = response.extras;
              }
            }
            
            setVehicles(vehicleList);
            setExtras(extrasList);
            
            // Update URL with new currencyId
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set('currencyId', newCurrencyId);
            setSearchParams(newSearchParams);
          } catch (error) {
            console.error('Error fetching vehicles after currency change:', error);
          } finally {
            setLoading(false);
          }
        };
        
        fetchVehicles();
      }
    };

    // Listen for custom currency change event (dispatched from Header)
    window.addEventListener('currencyChanged', handleCurrencyChange);

    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange);
    };
  }, [pickupLocationId, dropoffLocationId, pickupDate, dropoffDate, currentLanguage?.id, currencyId, pickupLocation, dropoffLocation, searchParams, setSearchParams]);

  const handleFilterChange = (key: keyof VehicleFilter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const handleSortChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: value === 'all' ? undefined : value,
    }));
  };

  const formatDate = (dateString: string) => {
    try {
      // Handle both ISO format and date+time format
      let date: Date;
      if (dateString.includes('T')) {
        date = parseISO(dateString);
      } else {
        // If it's just date, add time
        date = parseISO(dateString + 'T00:00:00');
      }
      return format(date, 'd MMM yyyy HH:mm', { locale: tr });
    } catch {
      return dateString;
    }
  };

  // Format fuel type and transmission (for sidebar)
  const formatFuelType = (fuel?: string) => {
    if (!fuel) return '';
    const fuelMap: Record<string, string> = {
      'gasoline': t('vehicleSearch.benzin'),
      'diesel': t('vehicleSearch.dizel'),
      'electric': t('vehicleSearch.elektrik'),
    };
    return fuelMap[fuel.toLowerCase()] || fuel;
  };

  const formatTransmission = (transmission?: string) => {
    if (!transmission) return '';
    const transMap: Record<string, string> = {
      'manual': t('vehicleSearch.manuel'),
      'automatic': t('vehicleSearch.otomatik'),
    };
    return transMap[transmission.toLowerCase()] || transmission;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('vehicleSearch.title')} | Berg Rent a Car`}
        description={t('vehicleSearch.seoDescription')}
        keywords={t('vehicleSearch.seoKeywords')}
        noindex={true}
      />
      <Header />
      
   

      <div className="bg-muted py-6">
        <div className="container mx-auto px-4">
          {/* Pickup and Return Info */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold mb-4">{t('vehicleSearch.pickupReturnInfo')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-muted-foreground">{t('vehicleSearch.pickup')}</span>
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="text-muted-foreground hover:text-primary"
                    title={t('vehicleSearch.edit')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">{pickupDate ? formatDate(pickupDate + 'T' + pickupTime) : '-'}</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {getLocationName('pickup', pickupLocation) || (pickupLocationId ? t('vehicleSearch.loadingLocation') || 'Yükleniyor...' : '-')}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-muted-foreground">{t('vehicleSearch.return')}</span>
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="text-muted-foreground hover:text-primary"
                    title={t('vehicleSearch.edit')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">{dropoffDate ? formatDate(dropoffDate + 'T' + dropoffTime) : '-'}</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {getLocationName('dropoff', dropoffLocation) || (dropoffLocationId ? t('vehicleSearch.loadingLocation') || 'Yükleniyor...' : '-')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <span className="text-sm font-semibold text-muted-foreground">{t('vehicleSearch.duration')}</span>
                <span className="ml-2 font-medium">{days} {t('vehicleSearch.day')}</span>
              </div>
              <button
                onClick={() => setPromoCodeOpen(!promoCodeOpen)}
                className="text-primary hover:underline flex items-center space-x-1"
              >
                <span>{t('vehicleSearch.promoCode')}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${promoCodeOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {promoCodeOpen && (
              <div className="mt-4 pt-4 border-t">
                <Input
                  placeholder={t('vehicleSearch.enterPromoCode')}
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Vehicle List */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <LoadingGif className="mx-auto mb-4" />
            <p className="mt-4 text-muted-foreground">{t('vehicleSearch.loading')}</p>
          </div>
        ) : displayedVehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">{t('vehicleSearch.noVehicles')}</p>
          </div>
        ) : (
          <>
            {/* Mileage Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Info className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-700 flex-1">
                {t('vehicleSearch.mileageInfo')
                  .replace('{days}', days.toString())
                  .replace('{km}', (days * 300).toLocaleString())}
              </p>
            </div>

            <div className="space-y-6">
            {displayedVehicles.map((vehicle) => (
              <VehicleCard 
                key={vehicle.id} 
                vehicle={vehicle} 
                days={days} 
                t={t}
                onReserve={() => {
                  setSelectedVehicle(vehicle);
                  setReservationModalOpen(true);
                }}
                onViewDetails={(vehicle) => {
                  setSelectedVehicleForDetails(vehicle);
                  setDetailsSheetOpen(true);
                }}
              />
            ))}
            </div>
          </>
        )}
      </div>

      <Footer />

      {/* Edit Search Modal */}
      <EditSearchModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        initialPickupLocationId={pickupLocationId}
        initialDropoffLocationId={dropoffLocationId}
        initialPickupDate={pickupDate || undefined}
        initialDropoffDate={dropoffDate || undefined}
        initialPickupTime={pickupTime}
        initialDropoffTime={dropoffTime}
        onSearch={(params) => {
          // Update URL parameters
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.set('pickupLocationId', String(params.pickupLocationId));
          newSearchParams.set('dropoffLocationId', String(params.dropoffLocationId));
          newSearchParams.set('pickupDate', params.pickupDate);
          newSearchParams.set('dropoffDate', params.dropoffDate);
          newSearchParams.set('pickupTime', params.pickupTime);
          newSearchParams.set('dropoffTime', params.dropoffTime);
          if (params.currencyId) {
            newSearchParams.set('currencyId', params.currencyId);
          }
          setSearchParams(newSearchParams);
        }}
      />

      {/* Reservation Modal */}
      <ReservationModal
        open={reservationModalOpen}
        onClose={() => {
          setReservationModalOpen(false);
          setSelectedVehicle(null);
        }}
        vehicle={selectedVehicle}
        extras={extras}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        pickupDate={pickupDate}
        dropoffDate={dropoffDate}
        pickupTime={pickupTime}
        dropoffTime={dropoffTime}
        rentalDays={days}
        onReserve={(selectedExtras) => {
          // Handle reservation completion
          console.log('Reservation completed:', {
            vehicle: selectedVehicle,
            extras: selectedExtras,
            pickupLocation,
            dropoffLocation,
            pickupDate,
            dropoffDate,
            pickupTime,
            dropoffTime,
            rentalDays: days,
          });
          // TODO: Call API to complete reservation
          // After successful reservation, you can navigate or show success message
          setReservationModalOpen(false);
          setSelectedVehicle(null);
        }}
      />

      {/* Vehicle Details Sidebar */}
      <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedVehicleForDetails && (
            <>
              <SheetHeader>
                <SheetTitle>{t('vehicleSearch.vehicleDetails')}</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Detaylar Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('vehicleSearch.details')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('vehicleSearch.brand')}</span>
                      <span className="text-sm font-medium">{selectedVehicleForDetails.brand?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('vehicleSearch.model')}</span>
                      <span className="text-sm font-medium">{selectedVehicleForDetails.model?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('vehicleSearch.fuelType')}</span>
                      <span className="text-sm font-medium">{formatFuelType(selectedVehicleForDetails.fuelType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('vehicleSearch.transmission')}</span>
                      <span className="text-sm font-medium">{formatTransmission(selectedVehicleForDetails.transmission)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('vehicleSearch.group')}</span>
                      <span className="text-sm font-medium">
                        {typeof selectedVehicleForDetails.category === 'object' 
                          ? selectedVehicleForDetails.category?.name 
                          : selectedVehicleForDetails.categoryName || selectedVehicleForDetails.segment || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Özellikler Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('vehicleSearch.features')}</h3>
                  <div className="space-y-3">
                    {selectedVehicleForDetails.seats && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{t('vehicleSearch.capacity')}</span>
                        <span className="text-sm font-medium">{selectedVehicleForDetails.seats} {t('vehicleSearch.passengers')}</span>
                      </div>
                    )}
                    {selectedVehicleForDetails.largeLuggage !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{t('vehicleSearch.largeLuggage')}</span>
                        <span className="text-sm font-medium">{selectedVehicleForDetails.largeLuggage}</span>
                      </div>
                    )}
                    {selectedVehicleForDetails.smallLuggage !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{t('vehicleSearch.smallLuggage')}</span>
                        <span className="text-sm font-medium">{selectedVehicleForDetails.smallLuggage}</span>
                      </div>
                    )}
                    {selectedVehicleForDetails.doors && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{t('vehicleSearch.doors')}</span>
                        <span className="text-sm font-medium">{selectedVehicleForDetails.doors} {t('vehicleSearch.doorsUnit')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kiralama Koşulları Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t('vehicleSearch.rentalConditions')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('vehicleSearch.minimumDriverAge')}</span>
                      <span className="text-sm font-medium">21</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{t('vehicleSearch.minimumLicenseAge')}</span>
                      <span className="text-sm font-medium">2 {t('vehicleSearch.years')}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">{t('vehicleSearch.fairKmUsage')}</span>
                      <p className="text-xs text-muted-foreground mt-1">{t('vehicleSearch.fairKmUsageDescription')}</p>
                    </div>
                  </div>
                </div>

                {/* Select Vehicle Button */}
                <Button 
                  onClick={() => {
                    setSelectedVehicle(selectedVehicleForDetails);
                    setDetailsSheetOpen(false);
                    setReservationModalOpen(true);
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4"
                >
                  {t('vehicleSearch.selectVehicle')}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

interface VehicleCardProps {
  vehicle: Vehicle;
  days: number;
  t: (key: string) => string;
  onReserve: () => void;
  onViewDetails: (vehicle: Vehicle) => void;
}

const VehicleCard = ({ vehicle, days, t, onReserve, onViewDetails }: VehicleCardProps) => {
  const [imageZoomOpen, setImageZoomOpen] = useState(false);

  // Get all images sorted by order, primary first
  const vehicleImages = vehicle.images && vehicle.images.length > 0
    ? [...vehicle.images].sort((a, b) => {
        if (a.isPrimary) return -1;
        if (b.isPrimary) return 1;
        return a.order - b.order;
      })
    : [];

  // Fallback image
  let fallbackImageUrl = '/placeholder-vehicle.jpg';
  if (vehicle.imageUrl || vehicle.image) {
    fallbackImageUrl = vehicle.imageUrl || vehicle.image || '/placeholder-vehicle.jpg';
  }

  // Get category name
  const categoryName = typeof vehicle.category === 'object' 
    ? vehicle.category?.name 
    : vehicle.categoryName || vehicle.category || vehicle.segment || '';

  // Get brand and model
  const brandName = vehicle.brand?.name || '';
  const modelName = vehicle.model?.name || '';

  // Format fuel type and transmission
  const formatFuelType = (fuel?: string) => {
    if (!fuel) return '';
    const fuelMap: Record<string, string> = {
      'gasoline': t('vehicleSearch.benzin'),
      'diesel': t('vehicleSearch.dizel'),
      'electric': t('vehicleSearch.elektrik'),
    };
    return fuelMap[fuel.toLowerCase()] || fuel;
  };

  const formatTransmission = (transmission?: string) => {
    if (!transmission) return '';
    const transMap: Record<string, string> = {
      'manual': t('vehicleSearch.manuel'),
      'automatic': t('vehicleSearch.otomatik'),
    };
    return transMap[transmission.toLowerCase()] || transmission;
  };

  // Calculate prices
  const totalPrice = vehicle.totalPrice || 0;
  const dailyPrice = vehicle.dailyPrice || 0;
  const payNowPrice = totalPrice || (dailyPrice * days);
  const payAtOfficePrice = vehicle.payAtOfficePrice || payNowPrice * 1.5;
  const savings = vehicle.savings || (payAtOfficePrice - payNowPrice);
  
  // Calculate daily price for display (use dailyPrice if available, otherwise calculate from total)
  const displayDailyPrice = dailyPrice > 0 ? dailyPrice : (payNowPrice / days);
  
  // Get currency symbol properly
  const getCurrencySymbolForVehicle = () => {
    if (vehicle.currencyCode) {
      if (vehicle.currencyCode === 'TRY') return '₺';
      if (vehicle.currencyCode === 'EUR') return '€';
      if (vehicle.currencyCode === 'USD') return '$';
      if (vehicle.currencyCode === 'GBP') return '£';
      return vehicle.currencyCode;
    }
    // Try to get from localStorage
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
      try {
        const currency = JSON.parse(savedCurrency);
        return currency.symbol || '€';
      } catch {
        return '€';
      }
    }
    return '€';
  };

  const currencySymbolForVehicle = getCurrencySymbolForVehicle();
  const kmLimit = days * 300;
  const minDriverAge = 25;
  const minLicenseAge = 3;

  // Included services list with tooltips (these would come from API in real implementation)
  const includedServices = [
    {
      name: t('vehicleSearch.includedServices.fullInsurance') || 'Kasko Sigortası',
      tooltip: t('vehicleSearch.includedServices.fullInsuranceTooltip') || 'Fiyatlarımıza Kasko Sigortası dahildir. Alkollü veya uyuşturucu madde kullanılması & Kırmızı ışık ihlali veya Araçı bir başkasına verilmesi & Kaza durumunda olay yerinin terk edilmesi halinde KASKO SIGORTASI GEÇERSİZDİR',
    },
    {
      name: t('vehicleSearch.includedServices.glassTireHeadlight') || 'Cam Lastik Far Sigortası',
      tooltip: t('vehicleSearch.includedServices.glassTireHeadlightTooltip') || 'Cam Lastik Far Sigortası dahildir. Cam, lastik ve far hasarları kapsam altındadır.',
    },
    {
      name: t('vehicleSearch.includedServices.theftInsurance') || 'Hırsızlık Sigortası',
      tooltip: t('vehicleSearch.includedServices.theftInsuranceTooltip') || 'Hırsızlık Sigortası dahildir. Araç çalınması veya hırsızlık durumunda sigorta kapsamındadır.',
    },
    {
      name: t('vehicleSearch.includedServices.airportDelivery') || '7/24 Havalimanı Teslimi',
      tooltip: t('vehicleSearch.includedServices.airportDeliveryTooltip') || '7/24 Havalimanı Teslimi dahildir. Havalimanlarında 7/24 araç teslim hizmeti sunulmaktadır.',
    },
    {
      name: t('vehicleSearch.includedServices.vatIncluded') || 'KDV Dahil',
      tooltip: t('vehicleSearch.includedServices.vatIncludedTooltip') || 'KDV Dahil. Tüm fiyatlar KDV dahil olarak gösterilmektedir.',
    },
    {
      name: t('vehicleSearch.includedServices.roadsideAssistance') || '7/24 Yol Hizmeti',
      tooltip: t('vehicleSearch.includedServices.roadsideAssistanceTooltip') || '7/24 Yol Hizmeti dahildir. 7 gün 24 saat yol yardım hizmeti sunulmaktadır.',
    },
  ];

  return (
    <Card className="hover:shadow-xl hover:shadow-orange-300/40 transition-all duration-300 ease-in-out relative overflow-hidden bg-gray-50 border border-gray-200 hover:border-orange-200/50 hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Left: Vehicle Image */}
          <div className="md:w-1/3 lg:w-1/4 relative bg-white">
            <div className="relative h-48 md:h-full min-h-[250px] flex items-center justify-center overflow-hidden">
              {vehicleImages.length > 0 ? (
                <Carousel className="w-full h-full">
                  <CarouselContent className="h-full -ml-0">
                    {vehicleImages.map((image) => (
                      <CarouselItem key={image.id} className="h-full pl-0 basis-full">
                        <div className="h-full w-full flex items-center justify-center overflow-hidden p-4">
                          <img
                            src={getApiAssetUrl(image.url)}
                            alt={image.alt || vehicle.name}
                            className="w-full h-auto object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-vehicle.jpg';
                            }}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {vehicleImages.length > 1 && (
                    <>
                      <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/80 hover:bg-white shadow-md z-10" />
                      <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/80 hover:bg-white shadow-md z-10" />
                    </>
                  )}
                </Carousel>
              ) : (
                <div className="h-full w-full flex items-center justify-center overflow-hidden p-4">
                  <img
                    src={getApiAssetUrl(fallbackImageUrl)}
                    alt={vehicle.name}
                    className="w-full h-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-vehicle.jpg';
                    }}
                  />
                </div>
              )}
              {/* Zoom Icon */}
              <button
                onClick={() => setImageZoomOpen(true)}
                className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors z-10"
                title={t('vehicleSearch.zoomImage') || 'Resmi büyüt'}
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Middle: Vehicle Details */}
          <div className="md:w-1/2 lg:w-2/5 p-4 md:p-6 flex flex-col justify-between">
            {/* Vehicle Title */}
            <div className="mb-4">
              <div className="flex items-start gap-2 mb-3">
                <h3 className="text-xl font-bold text-gray-900">
                  {brandName && modelName ? `${brandName} ${modelName}` : vehicle.name}
                  {brandName && modelName && (
                    <span className="text-gray-600 font-normal"> {t('vehicleSearch.orSimilar') || 'veya benzeri'}</span>
                  )}
                </h3>
                <button
                  onClick={() => onViewDetails(vehicle)}
                  className="text-blue-600 hover:text-blue-700 mt-1"
                  title={t('vehicleSearch.viewDetails') || 'Detaylar'}
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vehicle Specifications */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {vehicle.seats || 5} {t('vehicleSearch.passenger') || 'Yolcu'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {vehicle.doors || 5} {t('vehicleSearch.doorsUnit') || 'Kapı'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-sm text-gray-700">{t('vehicleSearch.yes') || 'Evet'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{formatFuelType(vehicle.fuelType) || t('vehicleSearch.dizel') || 'Dizel'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">{formatTransmission(vehicle.transmission) || t('vehicleSearch.manuel') || 'Manuel'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Luggage className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {vehicle.largeLuggage || 3} {t('vehicleSearch.largeLuggageUnit') || 'Büyük Valiz'}
                </span>
              </div>
            </div>

            {/* Driver Requirements & Limits */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">
                  {t('vehicleSearch.kmLimit') || 'Km sınırı'}: {kmLimit}
                </span>
                <Info className="w-3 h-3 text-gray-400 ml-1" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">
                  {t('vehicleSearch.minDriverAge') || 'Min Sürücü yaşı'}: {minDriverAge}
                </span>
                <Info className="w-3 h-3 text-gray-400 ml-1" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">
                  {t('vehicleSearch.minLicenseAge') || 'Min Ehliyet yaşı'}: {minLicenseAge}
                </span>
                <Info className="w-3 h-3 text-gray-400 ml-1" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">
                  {t('vehicleSearch.additionalDriver') || 'Ek sürücü'}: {t('vehicleSearch.free') || 'Ücretsiz'}
                </span>
                <Info className="w-3 h-3 text-gray-400 ml-1" />
              </div>
            </div>
          </div>

          {/* Right: Pricing */}
          <div className="md:w-1/3 lg:w-1/4 p-4 md:p-6 bg-gray-50 border-l border-gray-200 flex flex-col justify-between">
            <div>
              {/* Daily Price */}
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">{t('vehicleSearch.dailyFee') || 'Günlük Ücret'}</div>
                <div className="text-2xl font-bold text-gray-900">
                  {displayDailyPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbolForVehicle}
                </div>
              </div>

              {/* Rental Period */}
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">{t('vehicleSearch.rentalPeriod') || 'Kiralama Süresi'}:</div>
                <div className="text-lg font-semibold text-gray-900">{days} {t('vehicleSearch.day') || 'Gün'}</div>
              </div>

              {/* Total Price */}
              <div className="mb-6 pb-4 border-b border-gray-300">
                <div className="text-sm text-gray-600 mb-1">{t('vehicleSearch.rentalFee') || 'Kiralama Ücreti'}</div>
                <div className="text-xl font-bold text-gray-900">
                  {payNowPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbolForVehicle}
                </div>
              </div>
            </div>

            {/* Select Vehicle Button */}
            <Button 
              onClick={onReserve}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-base"
            >
              {t('vehicleSearch.selectVehicle') || 'Araç Seç'}
            </Button>
          </div>
        </div>

        {/* Bottom: Included Services */}
        <div className="px-4 md:px-6 py-4 bg-white border-t border-gray-200">
          <div className="text-sm font-semibold text-gray-900 mb-3">
            {t('vehicleSearch.includedServicesTitle') || 'FİYATA DAHİL HİZMETLER:'}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {includedServices.map((service, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{service.name}</span>
                <div className="relative flex-shrink-0 group">
                  <Info className="w-3 h-3 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-80 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                      <div className="whitespace-pre-line leading-relaxed">{service.tooltip}</div>
                      {/* Tooltip Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Image Zoom Modal */}
      <Dialog open={imageZoomOpen} onOpenChange={setImageZoomOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0 bg-black/95">
          <DialogHeader className="p-4 border-b border-gray-700">
            <DialogTitle className="text-white text-xl">
              {vehicle.name} - {t('vehicleSearch.vehicleImages') || 'Araç Görselleri'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
            {vehicleImages.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent className="-ml-0">
                  {vehicleImages.map((image) => (
                    <CarouselItem key={image.id} className="pl-0 basis-full">
                      <div className="flex items-center justify-center min-h-[60vh]">
                        <img
                          src={getApiAssetUrl(image.url)}
                          alt={image.alt || vehicle.name}
                          className="max-w-full max-h-[80vh] object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-vehicle.jpg';
                          }}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {vehicleImages.length > 1 && (
                  <>
                    <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/20 hover:bg-white/30 text-white border-white/30" />
                    <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/20 hover:bg-white/30 text-white border-white/30" />
                  </>
                )}
              </Carousel>
            ) : (
              <div className="flex items-center justify-center min-h-[60vh]">
                <img
                  src={getApiAssetUrl(fallbackImageUrl)}
                  alt={vehicle.name}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-vehicle.jpg';
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VehicleSearch;

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { MapPin, Building, Plane, Calendar, ChevronDown } from "lucide-react";
import { PickupLocation } from "@/types";
import { api } from "@/services/api";
import { useTranslation } from "@/contexts/TranslationContext";
import { useToast } from "@/hooks/use-toast";

interface EditSearchModalProps {
  open: boolean;
  onClose: () => void;
  initialPickupLocationId?: string | number | null;
  initialDropoffLocationId?: string | number | null;
  initialPickupDate?: string;
  initialDropoffDate?: string;
  initialPickupTime?: string;
  initialDropoffTime?: string;
  onSearch: (params: {
    pickupLocationId: string | number;
    dropoffLocationId: string | number;
    pickupDate: string;
    dropoffDate: string;
    pickupTime: string;
    dropoffTime: string;
    currencyId?: string;
  }) => void;
}

const EditSearchModal = ({
  open,
  onClose,
  initialPickupLocationId,
  initialDropoffLocationId,
  initialPickupDate,
  initialDropoffDate,
  initialPickupTime = "10:00",
  initialDropoffTime = "10:00",
  onSearch,
}: EditSearchModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    initialPickupDate ? parseISO(initialPickupDate) : undefined
  );
  const [dropoffDate, setDropoffDate] = useState<Date | undefined>(
    initialDropoffDate ? parseISO(initialDropoffDate) : undefined
  );
  const [pickupTime, setPickupTime] = useState(initialPickupTime);
  const [dropoffTime, setDropoffTime] = useState(initialDropoffTime);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<PickupLocation | null>(null);
  const [selectedDropoffLocation, setSelectedDropoffLocation] = useState<PickupLocation | null>(null);
  const [pickupLocationOpen, setPickupLocationOpen] = useState(false);
  const [dropoffLocationOpen, setDropoffLocationOpen] = useState(false);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [dropoffLocations, setDropoffLocations] = useState<PickupLocation[]>([]);
  const [differentDropoffLocation, setDifferentDropoffLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDropoff, setLoadingDropoff] = useState(false);

  const pickupLocationRef = useRef<HTMLDivElement>(null);
  const dropoffLocationRef = useRef<HTMLDivElement>(null);

  // Fetch pickup locations
  useEffect(() => {
    const fetchPickupLocations = async () => {
      try {
        setLoading(true);
        const data = await api.getPickupLocations();
        
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
          type?: string;
          parentId?: string | number | null;
          id_parent?: string | number | null;
          children?: ApiLocationItem[];
          drops?: unknown[];
          sort?: number;
          isActive?: boolean;
          [key: string]: unknown;
        }
        
        let locations: ApiLocationItem[] = [];
        if (Array.isArray(data)) {
          locations = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          locations = data.data;
        }

        const normalizedLocations = locations.map((item: ApiLocationItem): PickupLocation => {
          if (item.location) {
            return {
              id: item.location.id || item.id || item.locationId || 0,
              locationId: item.locationId || item.location.id || null, // Preserve locationId from top-level
              ...item.location,
              ...item,
              name: item.location.name || item.name || '',
              type: (item.location.type || item.type) as PickupLocation['type'],
              parentId: item.location.parentId ?? item.parentId ?? item.id_parent ?? null,
              children: (item.location.children || item.children || []) as PickupLocation[],
              drops: (item.drops || []) as PickupLocation['drops'],
            };
          }
          return {
            id: item.id || item.locationId || 0,
            locationId: item.locationId || null, // Preserve locationId
            ...item,
            name: item.name || '',
            type: item.type as PickupLocation['type'],
            parentId: item.parentId ?? item.id_parent ?? null,
            children: (item.children || []) as PickupLocation[],
            drops: (item.drops || []) as PickupLocation['drops'],
          } as PickupLocation;
        });

        const parentLocations = normalizedLocations.filter((loc: PickupLocation) => {
          const parentId = loc.parentId ?? loc.id_parent;
          return (parentId === null || parentId === undefined) && loc.isActive !== false;
        });

        const sortedLocations = parentLocations.sort((a, b) => {
          const sortA = a.sort ?? 0;
          const sortB = b.sort ?? 0;
          return sortA - sortB;
        });

        // Helper function to recursively normalize children and preserve drops
        const normalizeLocationWithChildren = (loc: PickupLocation | ApiLocationItem, allLocations: ApiLocationItem[]): PickupLocation => {
          const item = loc as ApiLocationItem;
          
          // Normalize the location itself
          let normalized: PickupLocation;
          if (item.location) {
            normalized = {
              id: item.location.id || item.id || item.locationId || 0,
              ...item.location,
              ...item,
              name: item.location.name || item.name || '',
              type: (item.location.type || item.type) as PickupLocation['type'],
              parentId: item.location.parentId ?? item.parentId ?? item.id_parent ?? null,
              children: (item.location.children || item.children || []) as PickupLocation[],
              drops: (item.drops || []) as PickupLocation['drops'],
            };
          } else {
            normalized = {
              id: item.id || item.locationId || 0,
              ...item,
              name: item.name || '',
              type: item.type as PickupLocation['type'],
              parentId: item.parentId ?? item.id_parent ?? null,
              children: (item.children || []) as PickupLocation[],
              drops: (item.drops || []) as PickupLocation['drops'],
            } as PickupLocation;
          }
          
          // Recursively normalize children and preserve their drops
          if (normalized.children && normalized.children.length > 0) {
            normalized.children = normalized.children.map((child: PickupLocation | ApiLocationItem) => {
              // Find the child in allLocations to get its drops
              const childId = (child as any).id || (child as any).locationId || (child as any).location?.id;
              const childInAllLocations = allLocations.find((loc: ApiLocationItem) => {
                const locId = loc.id || loc.locationId || loc.location?.id;
                return String(locId) === String(childId);
              });
              
              const childWithDrops = childInAllLocations || child;
              return normalizeLocationWithChildren(childWithDrops as ApiLocationItem, allLocations);
            });
          }
          
          return {
            ...normalized,
            title: normalized.name || normalized.title || '',
            drops: normalized.drops || [],
          };
        };

        // Map: name field'ını title olarak da set et ve children'ları da map et, drops array'ini de koru
        const mappedLocations = sortedLocations.map((loc: PickupLocation) => {
          // Find the location in all locations to ensure we have drops
          const locInAll = locations.find((item: ApiLocationItem) => {
            const itemId = item.id || item.locationId || item.location?.id;
            const locId = loc.id;
            return String(itemId) === String(locId);
          });
          
          const locationToNormalize = locInAll || loc;
          return normalizeLocationWithChildren(locationToNormalize as ApiLocationItem, locations);
        });

        setPickupLocations(mappedLocations);
        
        // Set initial pickup location
        if (initialPickupLocationId) {
          const findLocation = (id: string | number): PickupLocation | null => {
            const searchInArray = (arr: PickupLocation[]): PickupLocation | null => {
              for (const loc of arr) {
                if (String(loc.id) === String(id)) return loc;
                if (loc.children) {
                  const found = searchInArray(loc.children);
                  if (found) return found;
                }
              }
              return null;
            };
            return searchInArray(mappedLocations);
          };
          const pickup = findLocation(initialPickupLocationId);
          if (pickup) setSelectedPickupLocation(pickup);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching locations:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchPickupLocations();
    }
  }, [open, initialPickupLocationId]);

  // Group pickup locations - memoized for performance
  const groupedPickupLocations = useMemo(() => {
    return pickupLocations.reduce((acc, location) => {
      const key = location.id;
      if (!acc[key]) {
        acc[key] = { parent: location, children: [] };
      }
      if (location.children && location.children.length > 0) {
        acc[key].children = location.children;
      }
      return acc;
    }, {} as Record<string | number, { parent: PickupLocation; children: PickupLocation[] }>);
  }, [pickupLocations]);

  // Helper function to find location recursively in pickupLocations array
  // Also checks locationId field for matching - memoized for performance
  const findLocationRecursively = useCallback((locations: PickupLocation[], targetId: string | number): PickupLocation | null => {
    const targetIdStr = String(targetId);
    for (const loc of locations) {
      const locIdStr = String(loc.id);
      const locLocationIdStr = loc.locationId ? String(loc.locationId) : null;
      
      // Check if this location matches by id or locationId
      if (locIdStr === targetIdStr || locLocationIdStr === targetIdStr) {
        return loc;
      }
      if (loc.children && loc.children.length > 0) {
        const found = findLocationRecursively(loc.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Get dropoff locations
  useEffect(() => {
    const getDropoffLocations = () => {
      if (!selectedPickupLocation || !differentDropoffLocation) {
        setDropoffLocations([]);
        return;
      }

      try {
        setLoadingDropoff(true);
        
        // First, check if selected location itself has drops
        let mainLocation: PickupLocation | null = null;
        
        if (selectedPickupLocation.drops && Array.isArray(selectedPickupLocation.drops) && selectedPickupLocation.drops.length > 0) {
          // Selected location has drops, use it directly
          mainLocation = selectedPickupLocation;
        } else {
          // Selected location doesn't have drops, try to find parent
          const hasParentId = selectedPickupLocation.parentId !== null && selectedPickupLocation.parentId !== undefined;
          const hasIdParent = selectedPickupLocation.id_parent !== null && selectedPickupLocation.id_parent !== undefined;
          
          if (hasParentId || hasIdParent) {
            // Selected location is a child, find parent
            const parentId = selectedPickupLocation.parentId ?? selectedPickupLocation.id_parent;
            
            // First try parent object if it has drops
            if (selectedPickupLocation.parent && selectedPickupLocation.parent.drops && Array.isArray(selectedPickupLocation.parent.drops) && selectedPickupLocation.parent.drops.length > 0) {
              mainLocation = selectedPickupLocation.parent;
            } else {
              // Find parent from pickupLocations array recursively
              mainLocation = findLocationRecursively(pickupLocations, parentId);
              
              if (!mainLocation) {
                // Try to find parent by checking all locations directly
                const allLocationsFlat: PickupLocation[] = [];
                const flattenLocations = (locs: PickupLocation[]) => {
                  locs.forEach(loc => {
                    allLocationsFlat.push(loc);
                    if (loc.children && loc.children.length > 0) {
                      flattenLocations(loc.children);
                    }
                  });
                };
                flattenLocations(pickupLocations);
                
                mainLocation = allLocationsFlat.find(loc => {
                  const locId = String(loc.id);
                  const locLocationId = loc.locationId ? String(loc.locationId) : null;
                  const targetId = String(parentId);
                  return locId === targetId || locLocationId === targetId;
                }) || null;
              }
            }
          } else {
            // Selected location is already a parent but no drops, try to find it in pickupLocations array
            mainLocation = findLocationRecursively(pickupLocations, selectedPickupLocation.id);
            
            if (!mainLocation) {
              // Try flat search
              const allLocationsFlat: PickupLocation[] = [];
              const flattenLocations = (locs: PickupLocation[]) => {
                locs.forEach(loc => {
                  allLocationsFlat.push(loc);
                  if (loc.children && loc.children.length > 0) {
                    flattenLocations(loc.children);
                  }
                });
              };
              flattenLocations(pickupLocations);
              
              mainLocation = allLocationsFlat.find(loc => {
                const locId = String(loc.id);
                const locLocationId = loc.locationId ? String(loc.locationId) : null;
                const targetId = String(selectedPickupLocation.id);
                return locId === targetId || locLocationId === targetId;
              }) || null;
            }
          }
        }
        
        if (!mainLocation || !mainLocation.drops || !Array.isArray(mainLocation.drops) || mainLocation.drops.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('No drops found for location:', mainLocation?.id || mainLocation?.name || 'unknown');
          }
          setDropoffLocations([]);
          setLoadingDropoff(false);
          return;
        }
        
        // Filter active drops and convert to PickupLocation format
        const activeDrops = mainLocation.drops.filter((drop: any) => drop.isActive !== false);
        
        // Convert drops to PickupLocation format and find their children from pickupLocations
        const dropoffLocationsWithChildren: PickupLocation[] = activeDrops.map((drop: any) => {
          const dropLocationId = drop.deliveryLocationId;
          
          // Find this drop location in pickupLocations to get its children
          const dropLocationInPickupLocations = findLocationRecursively(pickupLocations, dropLocationId);
          
          // Create the drop location with its children
          const dropLocation: PickupLocation = {
            id: dropLocationId,
            name: drop.deliveryLocationName,
            title: drop.deliveryLocationName,
            isActive: drop.isActive !== false,
            type: dropLocationInPickupLocations?.type || null,
            children: dropLocationInPickupLocations?.children || [],
          };
          
          return dropLocation;
        });
        
        setDropoffLocations(dropoffLocationsWithChildren);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error processing dropoff locations:', error);
        }
        setDropoffLocations([]);
      } finally {
        setLoadingDropoff(false);
      }
    };

    getDropoffLocations();
  }, [selectedPickupLocation, differentDropoffLocation, pickupLocations]);

  // Group dropoff locations
  // Each drop location is shown as a parent with its children from pickupLocations
  const groupedDropoffLocations = useMemo(() => {
    if (!Array.isArray(dropoffLocations) || dropoffLocations.length === 0) {
      return {};
    }
    
    const result: Record<string | number, { parent: PickupLocation; children: PickupLocation[] }> = {};
    
    // Each drop location is a parent with its children
    dropoffLocations.forEach(location => {
      result[location.id] = {
        parent: location,
        children: location.children || []
      };
    });
    
    return result;
  }, [dropoffLocations]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickupLocationRef.current && !pickupLocationRef.current.contains(event.target as Node)) {
        setPickupLocationOpen(false);
      }
      if (dropoffLocationRef.current && !dropoffLocationRef.current.contains(event.target as Node)) {
        setDropoffLocationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to get main location ID (parent's ID if child, own ID if parent) - memoized
  const getMainLocationId = useCallback((location: PickupLocation | null): string | number | null => {
    if (!location) return null;
    
    // If location has a parent, return parent's ID
    const hasParentId = location.parentId !== null && location.parentId !== undefined;
    const hasIdParent = location.id_parent !== null && location.id_parent !== undefined;
    
    if (hasParentId || hasIdParent) {
      // This is a child location, return parent's ID
      return location.parentId ?? location.id_parent ?? location.id;
    }
    
    // This is already a parent location, return its own ID
    return location.id;
  }, []);

  // Save location data to localStorage (same format as SearchForm)
  const saveLocationDataToStorage = useCallback((pickup: PickupLocation, dropoff: PickupLocation, differentDropoff: boolean) => {
    try {
      const locationData = {
        pickupLocation: {
          id: pickup.id,
          locationId: pickup.locationId,
          name: pickup.name || pickup.title || '',
          type: pickup.type,
          parentId: pickup.parentId,
          city: pickup.city,
          country: pickup.country,
          address: pickup.address,
        },
        dropoffLocation: {
          id: dropoff.id,
          locationId: dropoff.locationId,
          name: dropoff.name || dropoff.title || '',
          type: dropoff.type,
          parentId: dropoff.parentId,
          city: dropoff.city,
          country: dropoff.country,
          address: dropoff.address,
        },
        differentDropoffLocation: differentDropoff,
        searchDate: new Date().toISOString(),
      };

      localStorage.setItem('searchLocationData', JSON.stringify(locationData));
      
      // Dispatch custom event to notify other components (e.g., VehicleSearch)
      window.dispatchEvent(new CustomEvent('searchLocationDataUpdated'));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('💾 [EDIT_MODAL] Location data saved to localStorage:', locationData);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [EDIT_MODAL] Error saving to localStorage:', error);
      }
    }
  }, []);

  const handleSearch = () => {
    if (!selectedPickupLocation || !pickupDate || !dropoffDate) {
      toast({
        variant: "destructive",
        title: t('errors.missingFields'),
        description: t('errors.missingFieldsDescription'),
      });
      return;
    }

    const finalDropoffLocation = differentDropoffLocation ? selectedDropoffLocation : selectedPickupLocation;
    
    if (differentDropoffLocation && !finalDropoffLocation) {
      toast({
        variant: "destructive",
        title: t('errors.missingDropOffLocation'),
        description: t('errors.missingDropOffLocationDescription'),
      });
      return;
    }

    if (isBefore(startOfDay(dropoffDate), startOfDay(pickupDate))) {
      toast({
        variant: "destructive",
        title: t('errors.invalidDate'),
        description: t('errors.invalidDateDescription'),
      });
      return;
    }

    // Save location data to localStorage before search
    saveLocationDataToStorage(selectedPickupLocation, finalDropoffLocation, differentDropoffLocation);

    // Get selected currency ID from localStorage
    const selectedCurrencyId = localStorage.getItem('selectedCurrencyId');

    // Get main location IDs (parent's ID if child, own ID if parent)
    const mainPickupLocationId = getMainLocationId(selectedPickupLocation);
    const mainDropoffLocationId = getMainLocationId(finalDropoffLocation);

    onSearch({
      pickupLocationId: mainPickupLocationId || selectedPickupLocation.id,
      dropoffLocationId: mainDropoffLocationId || finalDropoffLocation.id,
      pickupDate: format(pickupDate, 'yyyy-MM-dd'),
      dropoffDate: format(dropoffDate, 'yyyy-MM-dd'),
      pickupTime,
      dropoffTime,
      currencyId: selectedCurrencyId || undefined,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{t('vehicleSearch.editSearch')}</DialogTitle>
         
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pickup Location */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('vehicleSearch.pickupPoint')}
            </label>
            <div className="relative" ref={pickupLocationRef}>
              <button
                onClick={() => setPickupLocationOpen(!pickupLocationOpen)}
                className="w-full p-3 bg-gray-50 border rounded-md text-left flex items-center justify-between"
                disabled={loading}
              >
                <span className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {loading
                      ? t('searchForm.loadingLocations')
                      : selectedPickupLocation
                      ? selectedPickupLocation.name || selectedPickupLocation.title
                      : t('searchForm.chooseRentalStation')}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {pickupLocationOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                  {Object.keys(groupedPickupLocations).length === 0 && !loading ? (
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                      {t('searchForm.noLocationsAvailable')}
                    </div>
                  ) : (
                    Object.values(groupedPickupLocations).map(({ parent, children }) => (
                      <div key={`group-${parent.id}`}>
                        <button
                          onClick={() => {
                            setSelectedPickupLocation(parent);
                            setPickupLocationOpen(false);
                            setSelectedDropoffLocation(null);
                            setDifferentDropoffLocation(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm font-medium border-b"
                        >
                          {parent.name || parent.title}
                        </button>
                        {Array.isArray(children) && children.length > 0 && children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => {
                              setSelectedPickupLocation(child);
                              setPickupLocationOpen(false);
                              setSelectedDropoffLocation(null);
                              setDifferentDropoffLocation(false);
                            }}
                            className="w-full text-left px-5 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                          >
                            {child.type === 'airport' && <Plane className="w-4 h-4" />}
                            {child.type === 'hotel' && <Building className="w-4 h-4" />}
                            {child.type === 'otel' && <Building className="w-4 h-4" />}
                            {child.type === 'merkez' && <MapPin className="w-4 h-4" />}
                            {child.type === 'havalimani' && <Plane className="w-4 h-4" />}
                            {child.type === 'address' && <MapPin className="w-4 h-4" />}
                            <span>{child.name || child.title}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Different Dropoff Location Toggle */}
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
            <Checkbox
              id="differentDropoff"
              checked={differentDropoffLocation}
              onCheckedChange={(checked) => {
                setDifferentDropoffLocation(checked === true);
                if (!checked) {
                  setSelectedDropoffLocation(null);
                  setDropoffLocationOpen(false);
                }
              }}
              disabled={!selectedPickupLocation}
            />
            <label
              htmlFor="differentDropoff"
              className="text-sm cursor-pointer"
            >
              {t('searchForm.returnAtDifferentLocation')}
            </label>
          </div>

          {/* Dropoff Location */}
          {differentDropoffLocation && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('vehicleSearch.dropoffPoint')}
              </label>
              <div className="relative" ref={dropoffLocationRef}>
                <button
                  onClick={() => setDropoffLocationOpen(!dropoffLocationOpen)}
                  className="w-full p-3 bg-gray-50 border rounded-md text-left flex items-center justify-between"
                  disabled={loadingDropoff || !selectedPickupLocation}
                >
                  <span className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {loadingDropoff
                        ? t('searchForm.loadingDropoffLocations')
                        : selectedDropoffLocation
                        ? selectedDropoffLocation.name || selectedDropoffLocation.title
                        : t('searchForm.chooseDropOffStation')}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {dropoffLocationOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                    {Object.values(groupedDropoffLocations).map(({ parent, children }) => (
                      <div key={`dropoff-group-${parent.id}`}>
                        <button
                          onClick={() => {
                            setSelectedDropoffLocation(parent);
                            setDropoffLocationOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm font-medium border-b"
                        >
                          {parent.name || parent.title}
                        </button>
                        {Array.isArray(children) && children.length > 0 && children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => {
                              setSelectedDropoffLocation(child);
                              setDropoffLocationOpen(false);
                            }}
                            className="w-full text-left px-5 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                          >
                            {child.type === 'airport' && <Plane className="w-4 h-4" />}
                            {child.type === 'hotel' && <Building className="w-4 h-4" />}
                            {child.type === 'address' && <MapPin className="w-4 h-4" />}
                            <span>{child.name || child.title}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date and Time Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Pickup Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('vehicleSearch.pickupDate')}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full p-3 bg-gray-50 border rounded-md text-left flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {pickupDate ? format(pickupDate, 'd MMM yyyy', { locale: tr }) : t('searchForm.pickADate')}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={pickupDate}
                    onSelect={setPickupDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Pickup Time */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('vehicleSearch.pickupTime')}
              </label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full p-3 bg-gray-50 border rounded-md text-sm"
              />
            </div>

            {/* Dropoff Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('vehicleSearch.dropoffDate')}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full p-3 bg-gray-50 border rounded-md text-left flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {dropoffDate ? format(dropoffDate, 'd MMM yyyy', { locale: tr }) : t('searchForm.pickADate')}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dropoffDate}
                    onSelect={setDropoffDate}
                    disabled={(date) => pickupDate ? date < pickupDate : date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Dropoff Time */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('vehicleSearch.dropoffTime')}
              </label>
              <input
                type="time"
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
                className="w-full p-3 bg-gray-50 border rounded-md text-sm"
              />
            </div>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 text-lg"
          >
            {t('searchForm.searchNow')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditSearchModal;


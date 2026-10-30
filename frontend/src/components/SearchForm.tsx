/// <reference path="../types/google-maps.d.ts" />
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, isAfter, isBefore, startOfDay, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { api } from '@/services/api';
import { PickupLocation } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { MapPin, Building, Plane, Calendar, Clock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoadingGif from "@/components/LoadingGif";
import TransferModal from "@/components/TransferModal";

const GooglePlacesAutocomplete = lazy(() => import("@/components/GooglePlacesAutocomplete"));

interface SearchFormProps {
  onTabChange?: (tab: 'rental' | 'transfer') => void;
  variant?: 'default' | 'detailPage';
  defaultLocation?: string;
}

const SearchForm = ({ onTabChange, variant = 'default', defaultLocation }: SearchFormProps) => {
  const { toast } = useToast();
  const { currentLanguage, t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'rental' | 'transfer'>('rental');
  
  // Refs for click outside detection
  const pickupLocationRef = useRef<HTMLDivElement>(null);
  const dropoffLocationRef = useRef<HTMLDivElement>(null);
  const transferPickupLocationRef = useRef<HTMLDivElement>(null);
  const transferDropoffLocationRef = useRef<HTMLDivElement>(null);

  // Rental car search states
  const [pickupDate, setPickupDate] = useState<Date>();
  const [dropoffDate, setDropoffDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("10:00");
  const [dropoffTime, setDropoffTime] = useState("10:00");
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<PickupLocation | null>(null);
  const [selectedDropoffLocation, setSelectedDropoffLocation] = useState<PickupLocation | null>(null);
  const [pickupLocationOpen, setPickupLocationOpen] = useState(false);
  const [dropoffLocationOpen, setDropoffLocationOpen] = useState(false);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [dropoffLocations, setDropoffLocations] = useState<PickupLocation[]>([]);
  const [differentDropoffLocation, setDifferentDropoffLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDropoff, setLoadingDropoff] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Popover states for date/time pickers (detailPage variant)
  const [pickupDatePopoverOpen, setPickupDatePopoverOpen] = useState(false);
  const [pickupTimePopoverOpen, setPickupTimePopoverOpen] = useState(false);
  const [dropoffDatePopoverOpen, setDropoffDatePopoverOpen] = useState(false);
  const [dropoffTimePopoverOpen, setDropoffTimePopoverOpen] = useState(false);

  const [age26to69, setAge26to69] = useState(true);
  const [liveInUSA, setLiveInUSA] = useState(true);

  // Transfer search states
  const [transferPickupDate, setTransferPickupDate] = useState<Date>();
  const [transferPickupTime, setTransferPickupTime] = useState("10:00");
  const [transferPickupLocation, setTransferPickupLocation] = useState<PickupLocation | null>(null);
  const [transferDropoffLocation, setTransferDropoffLocation] = useState<PickupLocation | null>(null);
  const [transferPickupLocationOpen, setTransferPickupLocationOpen] = useState(false);
  const [transferDropoffLocationOpen, setTransferDropoffLocationOpen] = useState(false);
  const [transferPickupLocations, setTransferPickupLocations] = useState<PickupLocation[]>([]);
  const [transferDropoffLocations, setTransferDropoffLocations] = useState<PickupLocation[]>([]);
  const [passengers, setPassengers] = useState("1");
  const [transferLoading, setTransferLoading] = useState(false);
  
  // Google Places states for transfer
  const [transferPickupAddress, setTransferPickupAddress] = useState("");
  const [transferDropoffAddress, setTransferDropoffAddress] = useState("");
  const [transferPickupPlace, setTransferPickupPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [transferDropoffPlace, setTransferDropoffPlace] = useState<google.maps.places.PlaceResult | null>(null);
  
  // Transfer Modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Initialize default dates on component mount
  useEffect(() => {
    const tomorrow = addDays(new Date(), 1);
    const sevenDaysLater = addDays(new Date(), 7);
    setPickupDate(tomorrow);
    setDropoffDate(sevenDaysLater);
    setTransferPickupDate(tomorrow);
  }, []);

  // Update dropoffDate when pickupDate changes to ensure it's always after pickupDate
  useEffect(() => {
    if (pickupDate) {
      // If dropoffDate is not set or is before pickupDate, set it to 7 days after pickupDate
      if (!dropoffDate || isBefore(startOfDay(dropoffDate), startOfDay(pickupDate))) {
        setDropoffDate(addDays(pickupDate, 7));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupDate]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickupLocationRef.current && !pickupLocationRef.current.contains(event.target as Node)) {
        setPickupLocationOpen(false);
      }
      if (dropoffLocationRef.current && !dropoffLocationRef.current.contains(event.target as Node)) {
        setDropoffLocationOpen(false);
      }
      if (transferPickupLocationRef.current && !transferPickupLocationRef.current.contains(event.target as Node)) {
        setTransferPickupLocationOpen(false);
      }
      if (transferDropoffLocationRef.current && !transferDropoffLocationRef.current.contains(event.target as Node)) {
        setTransferDropoffLocationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch pickup locations on component mount
  useEffect(() => {
    const fetchPickupLocations = async () => {
      try {
        setLoading(true);
        
        // Check localStorage for cached locations
        const cachedLocations = localStorage.getItem('pickupLocations');
        const cacheTimestamp = localStorage.getItem('pickupLocationsTimestamp');
        
        // Check if cache exists and is from today
        if (cachedLocations && cacheTimestamp) {
          const today = new Date().toDateString();
          const cacheDate = new Date(cacheTimestamp).toDateString();
          
          if (today === cacheDate) {
            // Use cached data
            const parsedLocations = JSON.parse(cachedLocations);
            setPickupLocations(parsedLocations);
            setTransferPickupLocations(parsedLocations);
            
            // Set default location: Alanya Ofis (ID: f5625967-4d03-4a29-8b38-c17572da1cc2)
            const defaultLocationId = 'f5625967-4d03-4a29-8b38-c17572da1cc2';
            const findLocationById = (id: string | number, locations: PickupLocation[]): PickupLocation | null => {
              for (const loc of locations) {
                // Check both id and locationId fields
                if (String(loc.id) === String(id) || String(loc.locationId) === String(id)) {
                  return loc;
                }
                // Search in children recursively
                if (loc.children && loc.children.length > 0) {
                  const found = findLocationById(id, loc.children);
                  if (found) return found;
                }
              }
              return null;
            };
            const defaultLocation = findLocationById(defaultLocationId, parsedLocations);
            if (defaultLocation) {
              setSelectedPickupLocation(defaultLocation);
            }
            
            setLoading(false);
            return;
          }
        }

        // Fetch from API if cache is missing or expired
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

        // Normalize API response: merge location object with top-level fields
        // API response format: { id, locationId, location: { id, name, parentId, type, children }, name, type, ... }
        const normalizedLocations = locations.map((item: ApiLocationItem): PickupLocation => {
          // If location object exists, merge it with top-level fields
          if (item.location) {
            return {
              id: item.location.id || item.id || item.locationId || 0,
              locationId: item.locationId || item.location.id || null, // Preserve locationId from top-level
              ...item.location, // location object fields (id, name, parentId, type, children)
              ...item, // Top-level fields override (id, tenantId, locationId, sort, deliveryFee, etc.)
              // Ensure name and type come from location object if available
              name: item.location.name || item.name || '',
              type: (item.location.type || item.type) as PickupLocation['type'],
              parentId: item.location.parentId ?? item.parentId ?? item.id_parent ?? null,
              // Preserve children from location object or top-level
              children: (item.location.children || item.children || []) as PickupLocation[],
              // Preserve drops array
              drops: (item.drops || []) as PickupLocation['drops'],
            };
          }
          // If no location object, use item as is
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

        // API'den gelen veri zaten parent-child yapısında
        // parentId null olanları al (ana lokasyonlar/merkezler) ve children ile birlikte
        const parentLocations = normalizedLocations.filter((loc: PickupLocation) => {
          const parentId = loc.parentId ?? loc.id_parent;
          return (parentId === null || parentId === undefined) && loc.isActive !== false;
        });

        // Sort by sort field
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

        // Save to localStorage with current timestamp
        localStorage.setItem('pickupLocations', JSON.stringify(mappedLocations));
        localStorage.setItem('pickupLocationsTimestamp', new Date().toISOString());

        setPickupLocations(mappedLocations);
        setTransferPickupLocations(mappedLocations);
        
        // Set default location: Alanya Ofis (ID: f5625967-4d03-4a29-8b38-c17572da1cc2)
        const defaultLocationId = 'f5625967-4d03-4a29-8b38-c17572da1cc2';
        const findLocationById = (id: string | number, locations: PickupLocation[]): PickupLocation | null => {
          for (const loc of locations) {
            // Check both id and locationId fields
            if (String(loc.id) === String(id) || (loc.locationId && String(loc.locationId) === String(id))) {
              return loc;
            }
            // Search in children recursively
            if (loc.children && loc.children.length > 0) {
              const found = findLocationById(id, loc.children);
              if (found) return found;
            }
          }
          return null;
        };
        const defaultLocation = findLocationById(defaultLocationId, mappedLocations);
        if (defaultLocation) {
          setSelectedPickupLocation(defaultLocation);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching pickup locations:', error);
        }
        
        // Try to use cached data even if API fails
        const cachedLocations = localStorage.getItem('pickupLocations');
        if (cachedLocations) {
          try {
            const parsedLocations = JSON.parse(cachedLocations);
            setPickupLocations(parsedLocations);
            setTransferPickupLocations(parsedLocations);
          } catch (parseError) {
            setPickupLocations([]);
            setTransferPickupLocations([]);
          }
        } else {
          setPickupLocations([]);
          setTransferPickupLocations([]);
        }
        
        toast({
          variant: "destructive",
          title: t('errors.missingFields'),
          description: t('errors.failedToLoadLocations'),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPickupLocations();
  }, [currentLanguage?.id, t, toast]);

  // Fetch transfer locations separately
  useEffect(() => {
    const fetchTransferLocations = async () => {
      try {
        setTransferLoading(true);
        
        // Check localStorage for cached transfer locations
        const cachedTransferLocations = localStorage.getItem('transferLocations');
        const cacheTimestamp = localStorage.getItem('transferLocationsTimestamp');
        
        // Check if cache exists and is from today
        if (cachedTransferLocations && cacheTimestamp) {
          const today = new Date().toDateString();
          const cacheDate = new Date(cacheTimestamp).toDateString();
          
          if (today === cacheDate) {
            // Use cached data
            const { pickupLocations, dropoffLocations } = JSON.parse(cachedTransferLocations);
            setTransferPickupLocations(pickupLocations);
            setTransferDropoffLocations(dropoffLocations);
            setTransferLoading(false);
            return;
          }
        }

        // Fetch from API if cache is missing or expired
        const data = await api.getTransferLocations();
        
        // Map API response to component format
        // API returns: { pickupLocations: [{ id, name, type, address, latitude, longitude }], dropoffLocations: [...] }
        interface TransferLocationItem {
          id: string;
          name: string;
          type: string;
          address: string | null;
          latitude: string;
          longitude: string;
        }
        
        const pickupLocations: PickupLocation[] = (data.pickupLocations || []).map((loc: TransferLocationItem) => ({
          id: loc.id,
          name: loc.name,
          title: loc.name, // Map name to title for display
          type: loc.type as PickupLocation['type'],
          address: loc.address,
          latitude: loc.latitude ? parseFloat(loc.latitude) : undefined,
          longitude: loc.longitude ? parseFloat(loc.longitude) : undefined,
          isActive: true,
          parentId: null,
          id_parent: null,
        }));

        const dropoffLocations: PickupLocation[] = (data.dropoffLocations || []).map((loc: TransferLocationItem) => ({
          id: loc.id,
          name: loc.name,
          title: loc.name, // Map name to title for display
          type: loc.type as PickupLocation['type'],
          address: loc.address,
          latitude: loc.latitude ? parseFloat(loc.latitude) : undefined,
          longitude: loc.longitude ? parseFloat(loc.longitude) : undefined,
          isActive: true,
          parentId: null,
          id_parent: null,
        }));

        // Save to localStorage with current timestamp
        localStorage.setItem('transferLocations', JSON.stringify({ pickupLocations, dropoffLocations }));
        localStorage.setItem('transferLocationsTimestamp', new Date().toISOString());

        setTransferPickupLocations(pickupLocations);
        setTransferDropoffLocations(dropoffLocations);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching transfer locations:', error);
        }
        
        // Try to use cached data even if API fails
        const cachedTransferLocations = localStorage.getItem('transferLocations');
        if (cachedTransferLocations) {
          try {
            const { pickupLocations, dropoffLocations } = JSON.parse(cachedTransferLocations);
            setTransferPickupLocations(pickupLocations);
            setTransferDropoffLocations(dropoffLocations);
          } catch (parseError) {
            setTransferPickupLocations([]);
            setTransferDropoffLocations([]);
          }
        } else {
          setTransferPickupLocations([]);
          setTransferDropoffLocations([]);
        }
        
        toast({
          variant: "destructive",
          title: t('errors.fetchFailed'),
          description: t('errors.failedToLoadLocations'),
        });
      } finally {
        setTransferLoading(false);
      }
    };

    // Only fetch transfer locations when on transfer tab
    if (activeTab === 'transfer') {
      fetchTransferLocations();
    }
  }, [activeTab, t, toast]);

  // Helper function to find location recursively in pickupLocations array (including children)
  // Also checks locationId field for matching
  const findLocationRecursively = (locations: PickupLocation[], targetId: string | number): PickupLocation | null => {
    const targetIdStr = String(targetId);
    
    for (const loc of locations) {
      const locIdStr = String(loc.id);
      const locLocationIdStr = loc.locationId ? String(loc.locationId) : null;
      
      // Check if this location matches by id or locationId
      if (locIdStr === targetIdStr || locLocationIdStr === targetIdStr) {
        return loc;
      }
      // Recursively search in children
      if (loc.children && loc.children.length > 0) {
        const found = findLocationRecursively(loc.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Get dropoff locations from selected pickup location's drops array
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
            
            console.log('Looking for parent with ID:', parentId);
            console.log('Parent ID type:', typeof parentId);
            
            // First try parent object if it has drops
            if (selectedPickupLocation.parent && selectedPickupLocation.parent.drops && Array.isArray(selectedPickupLocation.parent.drops) && selectedPickupLocation.parent.drops.length > 0) {
              console.log('Found parent from selectedPickupLocation.parent');
              mainLocation = selectedPickupLocation.parent;
            } else {
              // Find parent from pickupLocations array recursively
              console.log('Searching in pickupLocations array...');
              mainLocation = findLocationRecursively(pickupLocations, parentId);
              
              if (!mainLocation) {
                // Try to find parent by checking all locations directly (including locationId)
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
            console.log('Selected location is parent, searching in array...');
            mainLocation = findLocationRecursively(pickupLocations, selectedPickupLocation.id);
          }
        }
        
        // Debug log
        console.log('=== DROPS DEBUG ===');
        console.log('Selected pickup location:', selectedPickupLocation);
        console.log('Selected location ID:', selectedPickupLocation.id);
        console.log('Selected location parentId:', selectedPickupLocation.parentId);
        console.log('Main location:', mainLocation);
        console.log('Main location ID:', mainLocation?.id);
        console.log('Main location locationId:', mainLocation?.locationId);
        console.log('Main location drops:', mainLocation?.drops);
        console.log('Main location drops length:', mainLocation?.drops?.length || 0);
        
        if (!mainLocation || !mainLocation.drops || !Array.isArray(mainLocation.drops) || mainLocation.drops.length === 0) {
          console.warn('No drops found for location:', mainLocation?.id || mainLocation?.name || 'unknown');
          setDropoffLocations([]);
          setLoadingDropoff(false);
          return;
        }
        
        // Filter active drops and convert to PickupLocation format
        const activeDrops = mainLocation.drops.filter((drop: any) => drop.isActive !== false);
        console.log('Active drops:', activeDrops.length);
        
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
        
        console.log('Dropoff locations with children:', dropoffLocationsWithChildren.length);
        setDropoffLocations(dropoffLocationsWithChildren);
      } catch (error) {
        console.error('Error processing dropoff locations:', error);
        setDropoffLocations([]);
      } finally {
        setLoadingDropoff(false);
      }
    };

    getDropoffLocations();
  }, [selectedPickupLocation, pickupLocations, differentDropoffLocation]);

  // Group pickup locations by parent (API'den zaten grouped geliyor)
  const groupedPickupLocations = React.useMemo(() => {
    if (!Array.isArray(pickupLocations) || pickupLocations.length === 0) {
      return {};
    }
    
    // API'den gelen veri zaten parent-child yapısında, direkt map et
    return pickupLocations.reduce((acc, location) => {
      if (location && (location.parentId === null || location.parentId === undefined)) {
        acc[location.id] = {
          parent: location,
          children: location.children || []
        };
      }
      return acc;
    }, {} as Record<string | number, { parent: PickupLocation; children: PickupLocation[] }>);
  }, [pickupLocations]);

  // Group dropoff locations
  // Each drop location is shown as a parent with its children from pickupLocations
  const groupedDropoffLocations = React.useMemo(() => {
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

  // Group transfer pickup locations (flat structure from API)
  const groupedTransferPickupLocations = React.useMemo(() => {
    if (!Array.isArray(transferPickupLocations) || transferPickupLocations.length === 0) {
      return {};
    }
    
    // Transfer locations come as a flat list from API (no parent-child relationships)
    // Each location is treated as a standalone item
    return transferPickupLocations.reduce((acc, location) => {
      if (location && location.id) {
        acc[location.id] = {
          parent: location,
          children: []
        };
      }
      return acc;
    }, {} as Record<string | number, { parent: PickupLocation; children: PickupLocation[] }>);
  }, [transferPickupLocations]);

  // Group transfer dropoff locations (flat structure from API)
  const groupedTransferDropoffLocations = React.useMemo(() => {
    if (!Array.isArray(transferDropoffLocations) || transferDropoffLocations.length === 0) {
      return {};
    }
    
    // Transfer dropoff locations come as a flat list from API
    // Each location is treated as a standalone item
    return transferDropoffLocations.reduce((acc, location) => {
      if (location && location.id) {
        acc[location.id] = {
          parent: location,
          children: []
        };
      }
      return acc;
    }, {} as Record<string | number, { parent: PickupLocation; children: PickupLocation[] }>);
  }, [transferDropoffLocations]);

  // Transfer dropoff locations are now loaded directly from API
  // No need to fetch based on pickup selection - all locations are available

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

  const handleSearch = () => {
    if (!selectedPickupLocation || !pickupDate || !dropoffDate) {
      toast({
        variant: "destructive",
        title: t('errors.missingFields'),
        description: t('errors.missingFieldsDescription'),
      });
      return;
    }

    // If different dropoff location is selected, it must be chosen
    if (differentDropoffLocation && !selectedDropoffLocation) {
      toast({
        variant: "destructive",
        title: t('errors.missingDropOffLocation'),
        description: t('errors.missingDropOffLocationDescription'),
      });
      return;
    }

    const finalDropoffLocation = differentDropoffLocation ? selectedDropoffLocation : selectedPickupLocation;

    // Validate dates
    if (isBefore(startOfDay(dropoffDate), startOfDay(pickupDate))) {
      toast({
        variant: "destructive",
        title: t('errors.invalidDate'),
        description: t('errors.invalidDateDescription'),
      });
      return;
    }

 
    const locationData = {
      pickupLocation: {
        id: selectedPickupLocation.id,
        locationId: selectedPickupLocation.locationId,
        name: selectedPickupLocation.name || selectedPickupLocation.title,
        type: selectedPickupLocation.type,
        parentId: selectedPickupLocation.parentId,
        city: selectedPickupLocation.city,
        country: selectedPickupLocation.country,
        address: selectedPickupLocation.address,
      },
      dropoffLocation: {
        id: finalDropoffLocation.id,
        locationId: finalDropoffLocation.locationId,
        name: finalDropoffLocation.name || finalDropoffLocation.title,
        type: finalDropoffLocation.type,
        parentId: finalDropoffLocation.parentId,
        city: finalDropoffLocation.city,
        country: finalDropoffLocation.country,
        address: finalDropoffLocation.address,
      },
      differentDropoffLocation,
      searchDate: new Date().toISOString(),
    };
 
    // Step 3: Save to localStorage
    console.log('💾 [SEARCH] Step 3: Saving to localStorage');
    try {
      localStorage.setItem('searchLocationData', JSON.stringify(locationData));
      
      // Dispatch custom event to notify other components (e.g., VehicleSearch)
      window.dispatchEvent(new CustomEvent('searchLocationDataUpdated'));
       
      // Verify it was saved
      const savedData = localStorage.getItem('searchLocationData');
     } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }

    // Get selected currency ID from localStorage
    const selectedCurrencyId = localStorage.getItem('selectedCurrencyId');
 
    const mainPickupLocationId = getMainLocationId(selectedPickupLocation);
    const mainDropoffLocationId = getMainLocationId(finalDropoffLocation);
 
    const searchQuery = new URLSearchParams({
      pickupLocationId: String(mainPickupLocationId || selectedPickupLocation.id),
      dropoffLocationId: String(mainDropoffLocationId || finalDropoffLocation.id),
      pickupDate: format(pickupDate, 'yyyy-MM-dd'),
      dropoffDate: format(dropoffDate, 'yyyy-MM-dd'),
      pickupTime,
      dropoffTime,
    });

    // Add currencyId if available
    if (selectedCurrencyId) {
      searchQuery.append('currencyId', selectedCurrencyId);
      console.log('💰 Currency ID:', selectedCurrencyId);
    }
 
 
    const searchUrl = `/vehicles/search?${searchQuery.toString()}`;
 
    
    navigate(searchUrl);
  };

  const handleAiSearch = async () => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      toast({
        variant: "destructive",
        title: t('searchForm.aiSearchError'),
        description: t('searchForm.aiNotConfigured'),
      });
      return;
    }

    if (!aiPrompt.trim()) {
      toast({
        variant: "destructive",
        title: t('errors.missingFields'),
        description: t('errors.missingFieldsDescription'),
      });
      return;
    }

    // Flatten all locations for the system prompt
    const allLocationsFlat: { id: string | number; name: string; type: string | null; parentId: string | number | null }[] = [];
    const flattenForAi = (locs: PickupLocation[]) => {
      locs.forEach(loc => {
        allLocationsFlat.push({
          id: loc.id,
          name: loc.name || loc.title || '',
          type: loc.type || null,
          parentId: loc.parentId ?? loc.id_parent ?? null,
        });
        if (loc.children && loc.children.length > 0) {
          flattenForAi(loc.children);
        }
      });
    };
    flattenForAi(pickupLocations);

    const today = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are a car rental search assistant. Today's date is ${today}.
Given the user's natural language request, extract the following information and return ONLY a valid JSON object with no extra text:
{
  "pickupLocationId": <id from the list below, or null>,
  "dropoffLocationId": <id from the list below, or null if same as pickup>,
  "pickupDate": "<YYYY-MM-DD>",
  "dropoffDate": "<YYYY-MM-DD>",
  "pickupTime": "<HH:MM, default 10:00>",
  "dropoffTime": "<HH:MM, default 10:00>"
}

Available locations:
${allLocationsFlat.map(l => `- id: ${l.id}, name: "${l.name}"${l.type ? `, type: ${l.type}` : ''}${l.parentId ? `, parentId: ${l.parentId}` : ''}`).join('\n')}

Rules:
- Match location names case-insensitively (e.g. "antalya havalimanı" matches "Antalya Havalimanı")
- If only one location is mentioned, use it for both pickup and dropoff (set dropoffLocationId to null)
- Always return valid YYYY-MM-DD dates
- Return ONLY the JSON object, no markdown, no explanation`;

    setAiLoading(true);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 256,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: aiPrompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || '';

      // Extract JSON from the response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const { pickupLocationId, dropoffLocationId, pickupDate: pDate, dropoffDate: dDate, pickupTime: pTime, dropoffTime: dTime } = parsed;

      // Find pickup location
      const foundPickup = pickupLocationId ? findLocationRecursively(pickupLocations, pickupLocationId) : null;
      if (!foundPickup) {
        toast({
          variant: "destructive",
          title: t('searchForm.aiLocationNotFound'),
          description: t('searchForm.aiLocationNotFoundDesc'),
        });
        return;
      }

      // Find dropoff location (if different)
      const foundDropoff = dropoffLocationId ? findLocationRecursively(pickupLocations, dropoffLocationId) : null;

      // Set dates
      const parsedPickupDate = pDate ? new Date(pDate) : undefined;
      const parsedDropoffDate = dDate ? new Date(dDate) : undefined;

      // Build location data for localStorage
      const finalDropoffLoc = foundDropoff || foundPickup;
      const isDifferentDropoff = !!foundDropoff && foundDropoff.id !== foundPickup.id;

      const locationData = {
        pickupLocation: {
          id: foundPickup.id,
          locationId: foundPickup.locationId,
          name: foundPickup.name || foundPickup.title,
          type: foundPickup.type,
          parentId: foundPickup.parentId,
          city: foundPickup.city,
          country: foundPickup.country,
          address: foundPickup.address,
        },
        dropoffLocation: {
          id: finalDropoffLoc.id,
          locationId: finalDropoffLoc.locationId,
          name: finalDropoffLoc.name || finalDropoffLoc.title,
          type: finalDropoffLoc.type,
          parentId: finalDropoffLoc.parentId,
          city: finalDropoffLoc.city,
          country: finalDropoffLoc.country,
          address: finalDropoffLoc.address,
        },
        differentDropoffLocation: isDifferentDropoff,
        searchDate: new Date().toISOString(),
      };

      localStorage.setItem('searchLocationData', JSON.stringify(locationData));
      window.dispatchEvent(new CustomEvent('searchLocationDataUpdated'));

      const selectedCurrencyId = localStorage.getItem('selectedCurrencyId');
      const mainPickupLocationId = getMainLocationId(foundPickup);
      const mainDropoffLocationId = getMainLocationId(finalDropoffLoc);

      const searchQuery = new URLSearchParams({
        pickupLocationId: String(mainPickupLocationId || foundPickup.id),
        dropoffLocationId: String(mainDropoffLocationId || finalDropoffLoc.id),
        pickupDate: parsedPickupDate ? format(parsedPickupDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        dropoffDate: parsedDropoffDate ? format(parsedDropoffDate, 'yyyy-MM-dd') : format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        pickupTime: pTime || '10:00',
        dropoffTime: dTime || '10:00',
      });

      if (selectedCurrencyId) {
        searchQuery.append('currencyId', selectedCurrencyId);
      }

      navigate(`/vehicles/search?${searchQuery.toString()}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('searchForm.aiSearchError'),
        description: t('searchForm.aiSearchErrorDesc'),
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleTransferSearch = () => {
    // Check if using Google Places or traditional locations
    const isUsingGooglePlaces = transferPickupAddress && transferDropoffAddress;
    
    // Debug log
    console.log('Transfer Search Debug:', {
      isUsingGooglePlaces,
      transferPickupAddress,
      transferDropoffAddress,
      transferPickupPlace,
      transferDropoffPlace,
      transferPickupDate,
      transferPickupTime,
    });
    
    if (isUsingGooglePlaces) {
      // More detailed validation messages
      const missingFields = [];
      if (!transferPickupPlace) missingFields.push(t('searchForm.pickupLocation'));
      if (!transferDropoffPlace) missingFields.push(t('searchForm.dropOffLocation'));
      if (!transferPickupDate) missingFields.push(t('searchForm.date'));
      
      if (missingFields.length > 0) {
        toast({
          variant: "destructive",
          title: t('errors.missingFields'),
          description: `${t('errors.missingFieldsDescription')}: ${missingFields.join(', ')}`,
        });
        return;
      }

      // Validate date is not in the past
      if (transferPickupDate && isBefore(startOfDay(transferPickupDate), startOfDay(new Date()))) {
        toast({
          variant: "destructive",
          title: t('errors.invalidDate'),
          description: t('errors.invalidDatePast'),
        });
        return;
      }

      // Open modal with Google Places data
      setTransferModalOpen(true);
    } else {
      // Traditional location selection
      if (!transferPickupLocation || !transferDropoffLocation || !transferPickupDate) {
        const missingFields = [];
        if (!transferPickupLocation) missingFields.push(t('searchForm.pickupLocation'));
        if (!transferDropoffLocation) missingFields.push(t('searchForm.dropOffLocation'));
        if (!transferPickupDate) missingFields.push(t('searchForm.date'));
        
        toast({
          variant: "destructive",
          title: t('errors.missingFields'),
          description: `${t('errors.missingFieldsDescription')}: ${missingFields.join(', ')}`,
        });
        return;
      }

      // Validate date is not in the past
      if (isBefore(startOfDay(transferPickupDate), startOfDay(new Date()))) {
        toast({
          variant: "destructive",
          title: t('errors.invalidDate'),
          description: t('errors.invalidDatePast'),
        });
        return;
      }

      // Map location types for API (handle various type formats)
      const getLocationType = (location: PickupLocation): 'airport' | 'hotel' | 'location' => {
        const type = location.type?.toLowerCase();
        if (type === 'airport' || type === 'havalimani') return 'airport';
        if (type === 'hotel' || type === 'otel') return 'hotel';
        return 'location';
      };

      // Build search URL with query parameters
      const searchParams = new URLSearchParams();
      searchParams.set('originType', getLocationType(transferPickupLocation));
      searchParams.set('originId', String(transferPickupLocation.id));
      searchParams.set('destinationType', getLocationType(transferDropoffLocation));
      searchParams.set('destinationId', String(transferDropoffLocation.id));
      searchParams.set('transferDate', format(transferPickupDate, 'yyyy-MM-dd'));
      searchParams.set('transferTime', transferPickupTime);
      searchParams.set('passengerCount', passengers);

      const searchUrl = `/transfer/search?${searchParams.toString()}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Transfer search URL:', searchUrl);
      }

      navigate(searchUrl);
    }
  };

  // Handler for Google Places pickup location change
  const handleTransferPickupPlaceChange = (place: google.maps.places.PlaceResult | null, address: string) => {
    setTransferPickupPlace(place);
    setTransferPickupAddress(address);
  };

  // Handler for Google Places dropoff location change
  const handleTransferDropoffPlaceChange = (place: google.maps.places.PlaceResult | null, address: string) => {
    setTransferDropoffPlace(place);
    setTransferDropoffAddress(address);
  };

  const handleTabChange = (value: string) => {
    const tab = value as 'rental' | 'transfer';
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Detail page variant - compact design like in the example
  if (variant === 'detailPage') {
    return (
      <div className="w-full max-w-full">
        {/* All Inputs in One Row - 12 Column Grid */}
        <div className="grid grid-cols-12 gap-2 mb-3">
          {/* Pickup Location - col-3 */}
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('searchForm.pickup') || 'Alış'}
            </label>
            <div className="relative">
              <Input
                type="text"
                value={defaultLocation || (selectedPickupLocation ? `${selectedPickupLocation.name || selectedPickupLocation.title}` : '')}
                readOnly
                className="w-full bg-white text-gray-900 border-gray-300 pr-8 cursor-pointer text-sm py-2 h-9"
                onClick={() => setPickupLocationOpen(!pickupLocationOpen)}
                placeholder={t('searchForm.chooseRentalStation')}
              />
              <button
                onClick={() => setPickupLocationOpen(!pickupLocationOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              {pickupLocationOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                  {Object.values(groupedPickupLocations).map(({ parent, children }) => (
                    <div key={`group-${parent.id}`}>
                      <button
                        onClick={() => {
                          const parentWithDrops = findLocationRecursively(pickupLocations, parent.id) || parent;
                          setSelectedPickupLocation(parentWithDrops);
                          setPickupLocationOpen(false);
                          setSelectedDropoffLocation(null);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900 text-sm font-medium border-b"
                      >
                        {parent.name || parent.title}
                      </button>
                      {Array.isArray(children) && children.length > 0 && children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            const parentId = child.parentId ?? child.id_parent;
                            let parentLocation: PickupLocation | null = null;
                            
                            if (parentId) {
                              parentLocation = findLocationRecursively(pickupLocations, parentId);
                            }
                            
                            const childWithParent = {
                              ...child,
                              parent: parentLocation,
                              parentId: parentId || child.parentId || child.id_parent,
                            };
                            setSelectedPickupLocation(childWithParent);
                            setPickupLocationOpen(false);
                            setSelectedDropoffLocation(null);
                          }}
                          className="w-full text-left px-6 py-2 text-gray-700 hover:bg-gray-100 text-sm flex items-center gap-2"
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
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dropoff Location - col-3 */}
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('searchForm.dropOff') || 'Dönüş'}
            </label>
            <div className="relative" ref={dropoffLocationRef}>
              <Input
                type="text"
                value={selectedDropoffLocation ? `${selectedDropoffLocation.name || selectedDropoffLocation.title}` : (selectedPickupLocation ? `${selectedPickupLocation.name || selectedPickupLocation.title}` : '')}
                readOnly
                className="w-full bg-white text-gray-900 border-gray-300 pr-8 cursor-pointer text-sm py-2 h-9"
                onClick={() => {
                  if (differentDropoffLocation && selectedPickupLocation) {
                    setDropoffLocationOpen(!dropoffLocationOpen);
                  }
                }}
                placeholder={differentDropoffLocation ? t('searchForm.chooseDropOffStation') : (selectedPickupLocation ? `${selectedPickupLocation.name || selectedPickupLocation.title}` : t('searchForm.chooseRentalStation'))}
                disabled={!differentDropoffLocation || !selectedPickupLocation}
              />
              <button
                onClick={() => {
                  if (differentDropoffLocation && selectedPickupLocation) {
                    setDropoffLocationOpen(!dropoffLocationOpen);
                  }
                }}
                disabled={!differentDropoffLocation || !selectedPickupLocation || loadingDropoff}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              {dropoffLocationOpen && differentDropoffLocation && selectedPickupLocation && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                  {Object.values(groupedDropoffLocations).map(({ parent, children }) => (
                    <div key={`dropoff-group-${parent.id}`}>
                      <button
                        onClick={() => {
                          setSelectedDropoffLocation(parent);
                          setDropoffLocationOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900 text-sm font-medium border-b"
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
                          className="w-full text-left px-6 py-2 text-gray-700 hover:bg-gray-100 text-sm flex items-center gap-2"
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
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pickup Date - col-2 */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('searchForm.pickupDate') || 'Alış Tarihi'}
            </label>
            <Popover open={pickupDatePopoverOpen} onOpenChange={setPickupDatePopoverOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-left text-xs h-9 text-gray-900">
                  <span className="block truncate">
                    {pickupDate ? format(pickupDate, "dd.MM.yyyy", { locale: String(currentLanguage?.code || 'en') === 'tr' ? tr : undefined }) : (t('searchForm.pickADate') || 'Tarih seçin')}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                <CalendarComponent
                  mode="single"
                  selected={pickupDate}
                  onSelect={(date) => {
                    if (date) {
                      setPickupDate(date);
                      // Close current popover
                      setPickupDatePopoverOpen(false);
                      // Auto-open pickup time popover after a short delay
                      setTimeout(() => {
                        setPickupTimePopoverOpen(true);
                      }, 150);
                    } else {
                      // If date is cleared, close popover
                      setPickupDatePopoverOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Pickup Time - col-1 */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('searchForm.pickupTime') || 'Saat'}
            </label>
            <Popover open={pickupTimePopoverOpen} onOpenChange={setPickupTimePopoverOpen}>
              <PopoverTrigger asChild>
                <button 
                  type="button"
                  className={`w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-left text-xs h-9 text-gray-900 ${
                    !pickupDate ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!pickupDate}
                >
                  <span className="block truncate">
                    {pickupTime || '10:00'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 bg-white z-50" align="start">
                <Input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => {
                    const newTime = e.target.value;
                    setPickupTime(newTime);
                  }}
                  onBlur={(e) => {
                    if (e.target.value) {
                      setPickupTimePopoverOpen(false);
                      // Auto-open dropoff date popover after a short delay
                      setTimeout(() => {
                        setDropoffDatePopoverOpen(true);
                      }, 100);
                    }
                  }}
                  className="w-full"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Dropoff Date - col-2 */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('searchForm.returnDate') || 'Dönüş Tarihi'}
            </label>
            <Popover open={dropoffDatePopoverOpen} onOpenChange={setDropoffDatePopoverOpen}>
              <PopoverTrigger asChild>
                <button 
                  type="button"
                  className={`w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-left text-xs h-9 text-gray-900 ${
                    !pickupDate || !pickupTime ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!pickupDate || !pickupTime}
                >
                  <span className="block truncate">
                    {dropoffDate ? format(dropoffDate, "dd.MM.yyyy", { locale: String(currentLanguage?.code || 'en') === 'tr' ? tr : undefined }) : (t('searchForm.pickADate') || 'Tarih seçin')}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dropoffDate}
                  onSelect={(date) => {
                    if (date) {
                      setDropoffDate(date);
                      // Close current popover
                      setDropoffDatePopoverOpen(false);
                      // Auto-open dropoff time popover after a short delay
                      setTimeout(() => {
                        setDropoffTimePopoverOpen(true);
                      }, 150);
                    } else {
                      // If date is cleared, close popover
                      setDropoffDatePopoverOpen(false);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  disabled={(date) => pickupDate ? isBefore(date, startOfDay(pickupDate)) : isBefore(date, startOfDay(new Date()))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Dropoff Time - col-1 */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('searchForm.returnTime') || 'Saat'}
            </label>
            <Popover open={dropoffTimePopoverOpen} onOpenChange={setDropoffTimePopoverOpen}>
              <PopoverTrigger asChild>
                <button 
                  type="button"
                  className={`w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-left text-xs h-9 text-gray-900 ${
                    !dropoffDate ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!dropoffDate}
                >
                  <span className="block truncate">
                    {dropoffTime || '10:00'}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 bg-white z-50" align="start">
                <Input
                  type="time"
                  value={dropoffTime}
                  onChange={(e) => {
                    const newTime = e.target.value;
                    setDropoffTime(newTime);
                  }}
                  onBlur={(e) => {
                    if (e.target.value) {
                      setDropoffTimePopoverOpen(false);
                    }
                  }}
                  className="w-full"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Different Dropoff Checkbox with Video Link - Below */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="differentDropoffDetail"
              checked={differentDropoffLocation}
              onCheckedChange={(checked) => {
                setDifferentDropoffLocation(checked === true);
                if (!checked) {
                  setSelectedDropoffLocation(null);
                  setDropoffLocationOpen(false);
                }
              }}
              disabled={!selectedPickupLocation}
              className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 h-4 w-4"
            />
            <label
              htmlFor="differentDropoffDetail"
              className="text-xs text-gray-700 cursor-pointer"
            >
              {t('searchForm.returnAtDifferentLocation')}
            </label>
          </div>
          <a
            href="#"
            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            {t('searchForm.deliveryProcessVideo') || 'Teslimat Süreci Videosu'}
          </a>
        </div>

        {/* Search Button */}
        <Button 
          onClick={handleSearch}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded text-base mb-3 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <LoadingGif size="sm" />
              <span>{t('searchForm.loading')}</span>
            </>
          ) : (
            t('searchForm.searchNow') || 'Ara'
          )}
        </Button>

        {/* Discount Code Link */}
        <div className="text-center">
          <a
            href="#"
            className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {t('searchForm.useDiscountCode') || 'İndirim Kodu Kullan'}
          </a>
        </div>
      </div>
    );
  }

  // Default variant - original design
  return (
    <div className="bg-primary/95 backdrop-blur-sm rounded-lg p-4 sm:p-6 max-w-4xl mx-auto w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/20 mb-4 sm:mb-6">
          <TabsTrigger 
            value="rental" 
            className="data-[state=active]:bg-white/30 data-[state=active]:text-white text-white/80"
          >
            {t('searchForm.rentalCarSearch')}
          </TabsTrigger>
          <TabsTrigger 
            value="transfer" 
            className="data-[state=active]:bg-white/30 data-[state=active]:text-white text-white/80"
          >
            {t('searchForm.transferSearch')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rental" className="space-y-3 sm:space-y-4">
        {/* AI / Normal Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAiMode(false)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              !aiMode
                ? 'bg-white text-gray-900 shadow'
                : 'bg-white/20 text-white/80 hover:bg-white/30'
            }`}
          >
            {t('searchForm.normalMode')}
          </button>
          <button
            onClick={() => setAiMode(true)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              aiMode
                ? 'bg-white text-purple-700 shadow ring-2 ring-purple-400'
                : 'bg-white/20 text-white/80 hover:bg-white/30'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            {t('searchForm.aiMode')}
          </button>
        </div>

        {/* AI Mode UI */}
        {aiMode && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 ring-2 ring-purple-400/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-300" />
              <span className="text-sm font-medium text-white">{t('searchForm.aiModeToggle')}</span>
            </div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              placeholder={t('searchForm.aiPromptPlaceholder')}
              className="w-full p-3 rounded-lg bg-white text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <div className="flex items-center justify-between mt-3 gap-2">
              <Button
                onClick={handleAiSearch}
                disabled={aiLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 text-sm flex items-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <LoadingGif size="sm" />
                    <span>{t('searchForm.aiSearchLoading')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('searchForm.aiSearchButton')}</span>
                  </>
                )}
              </Button>
              <button
                onClick={() => setAiMode(false)}
                className="text-xs text-white/70 hover:text-white underline"
              >
                {t('searchForm.normalMode')}
              </button>
            </div>
          </div>
        )}

        {/* Normal Mode Form Fields */}
        {!aiMode && (
        <>
        <div>
          <label className="block text-xs text-white/80 mb-1">{t('searchForm.chooseRentalStation')}</label>
          <div className="relative" ref={pickupLocationRef}>
            <button
              onClick={() => setPickupLocationOpen(!pickupLocationOpen)}
              className="w-full p-2 sm:p-3 bg-white text-black rounded border text-left text-black flex items-center justify-between text-xs sm:text-sm"
              disabled={loading}
            >
              <span className="text-xs sm:text-sm truncate">
                {loading 
                  ? t('searchForm.loadingLocations')
                  : selectedPickupLocation
                  ? `${selectedPickupLocation.name || selectedPickupLocation.title}${selectedPickupLocation.type ? ` (${selectedPickupLocation.type})` : ''}`
                  : t('searchForm.chooseRentalStation')}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {pickupLocationOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                {Object.keys(groupedPickupLocations).length === 0 && !loading ? (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">{t('searchForm.noLocationsAvailable')}</div>
                ) : (
                  Object.values(groupedPickupLocations).map(({ parent, children }) => (
                  <div key={`group-${parent.id}`}>
                    <button
                      onClick={() => {
                        // When selecting parent, ensure it has drops from the original data
                        const parentWithDrops = findLocationRecursively(pickupLocations, parent.id) || parent;
                        setSelectedPickupLocation(parentWithDrops);
                        setPickupLocationOpen(false);
                        setSelectedDropoffLocation(null);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-black text-sm font-medium border-b"
                    >
                      {parent.name || parent.title}
                    </button>
                    {Array.isArray(children) && children.length > 0 && children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => {
                          // When selecting a child, find parent from pickupLocations array
                          const parentId = child.parentId ?? child.id_parent;
                          let parentLocation: PickupLocation | null = null;
                          
                          if (parentId) {
                            // Try to find parent in pickupLocations (checks both id and locationId)
                            parentLocation = findLocationRecursively(pickupLocations, parentId);
                            
                            // If not found, try flat search (checks both id and locationId)
                            if (!parentLocation) {
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
                              parentLocation = allLocationsFlat.find(loc => {
                                const locId = String(loc.id);
                                const locLocationId = loc.locationId ? String(loc.locationId) : null;
                                const targetId = String(parentId);
                                return locId === targetId || locLocationId === targetId;
                              }) || null;
                            }
                          }
                          
                          // Create child with parent reference
                          const childWithParent = {
                            ...child,
                            parent: parentLocation,
                            parentId: parentId || child.parentId || child.id_parent,
                          };
                          setSelectedPickupLocation(childWithParent);
                          setPickupLocationOpen(false);
                          setSelectedDropoffLocation(null);
                        }}
                        className="w-full text-left px-5 py-2  text-black  hover:bg-gray-100 text-sm flex items-center gap-2"
                      >
                        {child.type === 'airport' && <Plane className="w-4 h-4" />}
                        {child.type === 'hotel' && <Building className="w-4 h-4" />}
                        {child.type === 'otel' && <Building className="w-4 h-4" />}
                        {child.type === 'merkez' && <MapPin className="w-4 h-4" />}
                        {child.type === 'havalimani' && <Plane className="w-4 h-4" />}
                        {child.type === 'address' && <MapPin className="w-4 h-4" />}
                        <span>{child.name || child.title} {child.type && `(${child.type})`}</span>
                      </button>
                    ))}
                  </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drop-off Location */}
        <div>
          <label className="block text-xs text-white/80 mb-1">{t('searchForm.dropOffStation')}</label>
          
          {/* Checkbox for different dropoff location */}
          <div className="flex items-center bg-white/20 rounded-lg p-2 space-x-2 mb-2">
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
              className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
            />
            <label
              htmlFor="differentDropoff"
              className="text-xs text-white/80 cursor-pointer"
            >
              {t('searchForm.returnAtDifferentLocation')}
            </label>
          </div>

          {/* Drop-off Location Select - Only show if checkbox is checked */}
          {differentDropoffLocation && selectedPickupLocation && (
            <div className="relative" ref={dropoffLocationRef}>
              <button
                onClick={() => {
                  setDropoffLocationOpen(!dropoffLocationOpen);
                }}
                className="w-full p-2 sm:p-3 bg-white text-black rounded border text-left flex items-center justify-between text-xs sm:text-sm"
                disabled={loadingDropoff}
              >
                <span className="text-xs sm:text-sm truncate">
                  {loadingDropoff
                    ? t('searchForm.loadingDropoffLocations')
                    : selectedDropoffLocation
                    ? `${selectedDropoffLocation.name || selectedDropoffLocation.title}${selectedDropoffLocation.type ? ` (${selectedDropoffLocation.type})` : ''}`
                    : t('searchForm.chooseDropOffStation')}
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {dropoffLocationOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                  {loadingDropoff ? (
                    <div className="px-3 py-2 text-sm text-gray-500">{t('searchForm.loadingDropoffLocations')}</div>
                  ) : (
                    Object.values(groupedDropoffLocations).map(({ parent, children }) => (
                      <div key={`dropoff-group-${parent.id}`}>
                        <button
                          onClick={() => {
                            setSelectedDropoffLocation(parent);
                            setDropoffLocationOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-black text-sm font-medium border-b"
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
                            className="w-full text-left px-5 py-2 text-black hover:bg-gray-100 text-sm flex items-center gap-2"
                          >
                            {child.type === 'airport' && <Plane className="w-4 h-4" />}
                            {child.type === 'hotel' && <Building className="w-4 h-4" />}
                            {child.type === 'otel' && <Building className="w-4 h-4" />}
                            {child.type === 'merkez' && <MapPin className="w-4 h-4" />}
                            {child.type === 'havalimani' && <Plane className="w-4 h-4" />}
                            {child.type === 'address' && <MapPin className="w-4 h-4" />}
                            <span>{child.name || child.title} {child.type && `(${child.type})`}</span>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                  {Object.keys(groupedDropoffLocations).length === 0 && !loadingDropoff && (
                    <div className="px-3 py-2 text-sm text-gray-500">{t('searchForm.noDropoffLocationsAvailable')}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Date Selection - Modern Card Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Pickup Date & Time Card */}
          <div className="bg-gray-100 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {/* Pickup Date */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full text-left">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                        <span className="text-xs text-gray-500">{t('searchForm.pickupDate')}</span>
                      </div>
                      <div className="text-sm sm:text-lg font-semibold text-black">
                        {pickupDate ? format(pickupDate, "d MMM yyyy", { locale: String(currentLanguage?.code || 'en') === 'tr' ? tr : undefined }) : t('searchForm.pickADate')}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={pickupDate}
                      onSelect={setPickupDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Pickup Time */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full text-left">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                        <span className="text-xs text-gray-500">{t('searchForm.pickupTime')}</span>
                      </div>
                      <div className="text-sm sm:text-lg font-semibold text-black">
                        {pickupTime}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3 bg-white z-50" align="start">
                    <Input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          {/* Return Date & Time Card */}
          <div className="bg-gray-100 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {/* Return Date */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full text-left">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                        <span className="text-xs text-gray-500">{t('searchForm.returnDate')}</span>
                      </div>
                      <div className="text-sm sm:text-lg font-semibold text-black">
                        {dropoffDate ? format(dropoffDate, "d MMM yyyy", { locale: String(currentLanguage?.code || 'en') === 'tr' ? tr : undefined }) : t('searchForm.pickADate')}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dropoffDate}
                      onSelect={setDropoffDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      disabled={(date) => pickupDate ? isBefore(date, startOfDay(pickupDate)) : isBefore(date, startOfDay(new Date()))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Return Time */}
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full text-left">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                        <span className="text-xs text-gray-500">{t('searchForm.returnTime')}</span>
                      </div>
                      <div className="text-sm sm:text-lg font-semibold text-black">
                        {dropoffTime}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3 bg-white z-50" align="start">
                    <Input
                      type="time"
                      value={dropoffTime}
                      onChange={(e) => setDropoffTime(e.target.value)}
                      className="w-full"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
        
   
        <Button
          onClick={handleSearch}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded text-base sm:text-lg mt-4 sm:mt-6 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <LoadingGif size="sm" />
              <span>{t('searchForm.loading')}</span>
            </>
          ) : (
            t('searchForm.searchNow')
          )}
        </Button>
        </>
        )}
        </TabsContent>

        <TabsContent value="transfer" className="space-y-3 sm:space-y-4">
          {/* Transfer Pickup Location - Google Places */}
          <div>
            <label className="block text-xs text-white/80 mb-1">{t('searchForm.pickupLocation')}</label>
            <Suspense fallback={<Input className="w-full p-2 sm:p-3 bg-white text-black rounded border" disabled />}>
              <GooglePlacesAutocomplete
                value={transferPickupAddress}
                onChange={handleTransferPickupPlaceChange}
                placeholder={t('searchForm.searchPickupLocation') || 'Alış noktası arayın (Otel, Bölge, vb.)'}
                className="w-full p-2 sm:p-3 bg-white text-black rounded border"
                country="tr"
              />
            </Suspense>
          </div>

          {/* Transfer Drop-off Location - Google Places */}
          <div>
            <label className="block text-xs text-white/80 mb-1">{t('searchForm.dropOffLocation')}</label>
            <Suspense fallback={<Input className="w-full p-2 sm:p-3 bg-white text-black rounded border" disabled />}>
              <GooglePlacesAutocomplete
                value={transferDropoffAddress}
                onChange={handleTransferDropoffPlaceChange}
                placeholder={t('searchForm.searchDropoffLocation') || 'Dönüş noktası arayın (Otel, Bölge, vb.)'}
                className="w-full p-2 sm:p-3 bg-white text-black rounded border"
                country="tr"
              />
            </Suspense>
          </div>


    
          {/* Transfer Date and Time */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div>
            <label className="block text-xs text-white/80 mb-1">{t('searchForm.pickupDateAndTime')}</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full p-2 sm:p-3 bg-white text-black rounded border text-left text-xs sm:text-sm">
                  {transferPickupDate ? format(transferPickupDate, "MM/dd/yyyy") + ` - ${transferPickupTime}` : t('searchForm.pickADate')}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white z-50" align="start">
                <CalendarComponent
                  mode="single"
                  selected={transferPickupDate}
                  onSelect={setTransferPickupDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                />
                <div className="p-3 border-t">
                  <label className="block text-xs text-gray-600 mb-1">{t('searchForm.time')}</label>
                  <Input
                    type="time"
                    value={transferPickupTime}
                    onChange={(e) => setTransferPickupTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="block text-xs text-white/80 mb-1">{t('searchForm.numberOfPassengers')}</label>
            <Select value={passengers} onValueChange={setPassengers}>
              <SelectTrigger className="w-full bg-white text-black">
                <SelectValue placeholder={t('searchForm.selectPassengers')} />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? t('searchForm.passenger') : t('searchForm.passengers')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
          <Button 
            onClick={handleTransferSearch}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded text-lg mt-6 flex items-center justify-center gap-2"
            disabled={transferLoading}
          >
            {transferLoading ? (
              <>
                <LoadingGif size="sm" />
                <span>{t('searchForm.loading')}</span>
              </>
            ) : (
              t('searchForm.searchTransfer')
            )}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Transfer Modal */}
      {transferPickupPlace && transferDropoffPlace && transferPickupDate && (
        <TransferModal
          open={transferModalOpen}
          onOpenChange={setTransferModalOpen}
          pickupLocation={transferPickupAddress}
          dropoffLocation={transferDropoffAddress}
          pickupDate={transferPickupDate}
          pickupTime={transferPickupTime}
          passengers={passengers}
          pickupLocationId={transferPickupPlace.place_id}
          dropoffLocationId={transferDropoffPlace.place_id}
          pickupLocationType="location"
          dropoffLocationType="location"
          pickupPlace={transferPickupPlace}
          dropoffPlace={transferDropoffPlace}
        />
      )}
    </div>
  );
};

export default SearchForm;
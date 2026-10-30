/// <reference path="../types/google-maps.d.ts" />
import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/TranslationContext";
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';
import { getLocaleFromPath } from '@/i18n/locales';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (place: google.maps.places.PlaceResult | null, address: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  country?: string; // Restrict to specific country (e.g., 'tr' for Turkey)
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  country = 'tr',
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [placeSelected, setPlaceSelected] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingFromDropdown = useRef(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        await loadGoogleMaps(getLocaleFromPath());
      } catch {
        return;
      }
      if (cancelled || !inputRef.current) return;
      initAutocomplete();
    };

    setup();

    function initAutocomplete() {
      if (!inputRef.current || typeof google === 'undefined' || !google.maps?.places) return;

      // Suppress the deprecation warning
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('google.maps.places.Autocomplete is not available to new customers')) {
          return;
        }
        originalWarn.apply(console, args);
      };

      try {
        console.log('✅ Initializing Google Places Autocomplete...');
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'],
          componentRestrictions: { country },
          fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry', 'types'],
        });

        console.log('✅ Autocomplete initialized successfully');

        // Add mousedown listener to dropdown to detect selection
        // Google Places creates a .pac-container div for the dropdown
        setTimeout(() => {
          const pacContainers = document.querySelectorAll('.pac-container');
          pacContainers.forEach(container => {
            // Use mousedown to detect click start
            container.addEventListener('mousedown', () => {
              console.log('🖱️ Dropdown item mousedown - selection starting');
              isSelectingFromDropdown.current = true;
              // Don't prevent default - let Google handle the click
            });
            
            // Use click to confirm selection completed
            container.addEventListener('click', () => {
              console.log('✅ Dropdown item clicked - selection complete');
              setTimeout(() => {
                isSelectingFromDropdown.current = false;
              }, 100);
            });
            
            container.addEventListener('touchstart', () => {
              console.log('👆 Dropdown touched - selection starting');
              isSelectingFromDropdown.current = true;
            }, { passive: true });
            
            container.addEventListener('touchend', () => {
              console.log('✅ Dropdown touch complete');
              setTimeout(() => {
                isSelectingFromDropdown.current = false;
              }, 100);
            }, { passive: true });
          });
        }, 100);

        // Listen for place selection
        const placeChangedListener = () => {
          isSelectingFromDropdown.current = false;
          const place = autocompleteRef.current?.getPlace();
          console.log('📍 Place selected (full):', {
            name: place?.name,
            formatted_address: place?.formatted_address,
            types: place?.types,
            place_id: place?.place_id,
          });
          
          if (place && (place.formatted_address || place.name)) {
            // Determine the best display text
            let displayText = '';
            
            // For establishments (hotels, airports, etc.), prefer name + location
            if (place.types?.includes('airport') || 
                place.types?.includes('lodging') || 
                place.types?.includes('establishment')) {
              // Use name as primary, add city if available
              displayText = place.name || '';
              
              // Try to add city/locality from address_components
              if (place.address_components) {
                const city = place.address_components.find(
                  comp => comp.types.includes('locality') || comp.types.includes('administrative_area_level_1')
                );
                if (city && !displayText.includes(city.long_name)) {
                  displayText += `, ${city.long_name}`;
                }
              }
              
              // If we couldn't build a good name, fall back to formatted_address
              if (!displayText || displayText.length < 3) {
                displayText = place.formatted_address || place.name || '';
              }
            } else {
              // For regular addresses, use formatted_address
              displayText = place.formatted_address || place.name || '';
            }
            
            setInputValue(displayText);
            setPlaceSelected(true);
            onChange(place, displayText);
            console.log('✅ Place change triggered:', {
              displayText,
              placeId: place.place_id,
              types: place.types,
            });
          } else {
            console.warn('⚠️ Place selected but no address');
            setPlaceSelected(false);
          }
        };
        
        autocompleteRef.current.addListener('place_changed', placeChangedListener);
      } catch (error) {
        console.error('❌ Error initializing Google Places Autocomplete:', error);
      }

      // Restore console.warn
      console.warn = originalWarn;
    }

    // Cleanup
    return () => {
      cancelled = true;
      if (autocompleteRef.current && typeof google !== 'undefined' && google.maps?.event) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]); // Remove onChange from deps to prevent re-initialization

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setPlaceSelected(false); // Reset selection flag when typing
    
    // If input is cleared, notify parent
    if (!newValue) {
      onChange(null, '');
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Give Google Places a moment to process the selection
      setTimeout(() => {
        if (autocompleteRef.current) {
          const place = autocompleteRef.current.getPlace();
          console.log('⌨️ Enter pressed, checking place:', place);
          
          if (place && place.place_id) {
            console.log('✅ Place found via Enter key');
            setPlaceSelected(true);
          } else {
            console.log('⚠️ No place found, will use manual input');
          }
        }
      }, 100);
    }
  };

  // Handle input blur - check if place was selected
  const handleInputBlur = () => {
    // If user is clicking on dropdown, don't process blur yet
    if (isSelectingFromDropdown.current) {
      console.log('⏳ Dropdown selection in progress, waiting...');
      // Wait longer for the selection to complete
      blurTimeoutRef.current = setTimeout(() => {
        isSelectingFromDropdown.current = false;
        processBlur();
      }, 500);
      return;
    }
    
    // Use timeout to allow autocomplete selection to complete first
    blurTimeoutRef.current = setTimeout(() => {
      processBlur();
    }, 200);
  };

  const processBlur = () => {
      // Try to get the place from autocomplete one last time
      let finalPlace = null;
      if (autocompleteRef.current) {
        try {
          finalPlace = autocompleteRef.current.getPlace();
        } catch (e) {
          // Ignore errors
        }
      }

      console.log('🔍 Blur check:', {
        inputValue,
        placeSelected,
        finalPlace: finalPlace?.place_id ? 'Found' : 'Not found',
      });
      
      // If we found a place from autocomplete, use it
      if (finalPlace && finalPlace.place_id && !placeSelected) {
        console.log('✅ Found place on blur, using it');
        
        let displayText = '';
        if (finalPlace.types?.includes('airport') || 
            finalPlace.types?.includes('lodging') || 
            finalPlace.types?.includes('establishment')) {
          displayText = finalPlace.name || '';
          if (finalPlace.address_components) {
            const city = finalPlace.address_components.find(
              comp => comp.types.includes('locality') || comp.types.includes('administrative_area_level_1')
            );
            if (city && !displayText.includes(city.long_name)) {
              displayText += `, ${city.long_name}`;
            }
          }
          if (!displayText || displayText.length < 3) {
            displayText = finalPlace.formatted_address || finalPlace.name || '';
          }
        } else {
          displayText = finalPlace.formatted_address || finalPlace.name || '';
        }
        
        setInputValue(displayText);
        setPlaceSelected(true);
        onChange(finalPlace, displayText);
        return;
      }
      
      // If still no place selected, use manual input
      if (inputValue && !placeSelected && (!finalPlace || !finalPlace.place_id)) {
        console.log('⚠️ Using manual input (dropdown seçimi yapılmadı)');
        const mockPlace: google.maps.places.PlaceResult = {
          place_id: `manual_${Date.now()}`,
          formatted_address: inputValue,
          name: inputValue,
        };
        onChange(mockPlace, inputValue);
        console.log('ℹ️ Manuel giriş kullanıldı - mesafe hesaplanamayabilir');
      } else if (placeSelected || (finalPlace && finalPlace.place_id)) {
        console.log('✅ Place selected successfully');
      }
  };

  const handleInputFocus = () => {
    // Clear blur timeout if user focuses back
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onBlur={handleInputBlur}
      onFocus={handleInputFocus}
      placeholder={placeholder || t('searchForm.searchLocation')}
      className={className}
      disabled={disabled}
      autoComplete="off"
    />
  );
};

export default GooglePlacesAutocomplete;

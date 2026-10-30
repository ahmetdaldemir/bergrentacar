import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { MapPin, Calendar, Clock, User } from "lucide-react";
import { api } from '@/services/api';
import LoadingGif from "@/components/LoadingGif";
import { useToast } from "@/hooks/use-toast";

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: Date;
  pickupTime: string;
  passengers: string;
  pickupLocationId?: string;
  dropoffLocationId?: string;
  pickupLocationType?: 'airport' | 'hotel' | 'location';
  dropoffLocationType?: 'airport' | 'hotel' | 'location';
  pickupPlace?: google.maps.places.PlaceResult | null;
  dropoffPlace?: google.maps.places.PlaceResult | null;
}

interface TransferVehicle {
  id: string;
  name: string;
  type: string;
  capacity: number;
  luggage: number;
  image?: string;
  price: number;
  currency: string;
  description?: string;
  features?: string[];
}

const TransferModal: React.FC<TransferModalProps> = ({
  open,
  onOpenChange,
  pickupLocation,
  dropoffLocation,
  pickupDate,
  pickupTime,
  passengers,
  pickupLocationId,
  dropoffLocationId,
  pickupLocationType,
  dropoffLocationType,
  pickupPlace,
  dropoffPlace,
}) => {
  const { t, currentLanguage } = useTranslation();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<TransferVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  // Calculate distance when modal opens
  useEffect(() => {
    if (open && pickupPlace && dropoffPlace) {
      calculateDistance();
    }
  }, [open, pickupPlace, dropoffPlace]);

  useEffect(() => {
    if (open && pickupLocationId && dropoffLocationId) {
      fetchTransferVehicles();
    }
  }, [open, pickupLocationId, dropoffLocationId]);

  const calculateDistance = async () => {
    if (!pickupPlace?.geometry?.location || !dropoffPlace?.geometry?.location) {
      return;
    }

    setCalculatingDistance(true);

    try {
      // Check if Google Maps API is loaded
      if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps API not loaded');
        return;
      }

      // Use Distance Matrix Service for accurate road distance
      const service = new google.maps.DistanceMatrixService();
      
      const request = {
        origins: [pickupPlace.geometry.location],
        destinations: [dropoffPlace.geometry.location],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      };

      service.getDistanceMatrix(request, (response, status) => {
        if (status === 'OK' && response) {
          const result = response.rows[0]?.elements[0];
          if (result && result.status === 'OK') {
            // Distance in km
            const distanceKm = (result.distance.value / 1000).toFixed(1);
            setDistance(`${distanceKm} km`);
            
            // Duration
            const durationMin = Math.round(result.duration.value / 60);
            setDuration(`${durationMin} ${t('transfer.minutes') || 'dakika'}`);
          }
        } else {
          console.error('Distance calculation failed:', status);
          // Fallback to straight-line distance
          calculateStraightLineDistance();
        }
        setCalculatingDistance(false);
      });
    } catch (error) {
      console.error('Error calculating distance:', error);
      calculateStraightLineDistance();
      setCalculatingDistance(false);
    }
  };

  const calculateStraightLineDistance = () => {
    if (!pickupPlace?.geometry?.location || !dropoffPlace?.geometry?.location) {
      return;
    }

    try {
      const pickup = pickupPlace.geometry.location;
      const dropoff = dropoffPlace.geometry.location;

      // Calculate straight-line distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (dropoff.lat() - pickup.lat()) * Math.PI / 180;
      const dLon = (dropoff.lng() - pickup.lng()) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(pickup.lat() * Math.PI / 180) * Math.cos(dropoff.lat() * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceKm = (R * c).toFixed(1);
      
      setDistance(`~${distanceKm} km`);
      setDuration(''); // No duration for straight-line distance
    } catch (error) {
      console.error('Error calculating straight-line distance:', error);
    }
  };

  const fetchTransferVehicles = async () => {
    try {
      setLoading(true);
      
      // Check if using manual IDs (from manual input, not Google Places selection)
      const isManualPickup = pickupLocationId?.startsWith('manual_');
      const isManualDropoff = dropoffLocationId?.startsWith('manual_');
      
      if (isManualPickup || isManualDropoff) {
        console.warn('⚠️ Manual location IDs detected, showing mock vehicles');
        // Show mock vehicles for manual inputs
        showMockVehicles();
        return;
      }
      
      // Build search params
      const params = {
        originType: pickupLocationType || 'location',
        originId: pickupLocationId || '',
        destinationType: dropoffLocationType || 'location',
        destinationId: dropoffLocationId || '',
        transferDate: format(pickupDate, 'yyyy-MM-dd'),
        transferTime: pickupTime,
        passengerCount: parseInt(passengers),
      };

      const response = await api.searchTransfers(params);
      
      // Map API response to component format
      const mappedVehicles: TransferVehicle[] = (response.transfers || []).map((transfer: any) => ({
        id: transfer.vehicle?.id || Math.random().toString(),
        name: transfer.vehicle?.name || 'Transfer Vehicle',
        type: transfer.vehicle?.type || 'sedan',
        capacity: transfer.vehicle?.capacity || 4,
        luggage: transfer.vehicle?.luggage || 2,
        image: transfer.vehicle?.images?.[0] || '/placeholder-car.jpg',
        price: transfer.pricing?.totalPrice || 0,
        currency: transfer.pricing?.currencyCode || 'TRY',
        description: transfer.vehicle?.description,
        features: transfer.vehicle?.features || [],
      }));

      setVehicles(mappedVehicles);
    } catch (error) {
      console.error('Error fetching transfer vehicles:', error);
      toast({
        variant: "destructive",
        title: t('errors.fetchFailed'),
        description: t('errors.failedToLoadTransfers'),
      });
      
      // Show mock data on error
      showMockVehicles();
    } finally {
      setLoading(false);
    }
  };

  const showMockVehicles = () => {
    setVehicles([
        {
          id: '1',
          name: 'Economy Sedan',
          type: 'sedan',
          capacity: 3,
          luggage: 2,
          image: '/placeholder-sedan.jpg',
          price: 150,
          currency: 'TRY',
          features: ['Air Conditioning', 'Professional Driver', 'Free WiFi'],
        },
        {
          id: '2',
          name: 'Premium Van',
          type: 'van',
          capacity: 7,
          luggage: 5,
          image: '/placeholder-van.jpg',
          price: 250,
          currency: 'TRY',
          features: ['Air Conditioning', 'Professional Driver', 'Free WiFi', 'Extra Space'],
        },
        {
          id: '3',
          name: 'Luxury Sedan',
          type: 'luxury',
          capacity: 3,
          luggage: 2,
          image: '/placeholder-luxury.jpg',
          price: 300,
          currency: 'TRY',
          features: ['Air Conditioning', 'Professional Driver', 'Free WiFi', 'Leather Seats', 'Premium Service'],
        },
    ]);
  };

  const handleBooking = (vehicle: TransferVehicle) => {
    // Handle booking logic
    toast({
      title: t('booking.success'),
      description: `${vehicle.name} - ${vehicle.price} ${vehicle.currency}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
            {t('transfer.availableVehicles') || 'Transfer Araçları'}
          </DialogTitle>
          <div className="sr-only" role="status" aria-live="polite">
            Transfer search results
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Trip Details - Enhanced Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-green-100 rounded-full p-2">
                  <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('searchForm.pickupLocation')}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{pickupLocation}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-red-100 rounded-full p-2">
                  <MapPin className="w-5 h-5 text-red-600 flex-shrink-0" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('searchForm.dropOffLocation')}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{dropoffLocation}</p>
                </div>
              </div>
              
              {/* Distance Display */}
              {(distance || calculatingDistance) && (
                <div className="flex items-start gap-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 shadow-sm">
                  <div className="bg-indigo-100 rounded-full p-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('transfer.distance') || 'Mesafe'}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {calculatingDistance ? (
                        <span className="text-gray-400 text-sm">{t('loading') || 'Hesaplanıyor...'}</span>
                      ) : (
                        <span className="text-indigo-600">{distance}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Duration Display */}
              {duration && !calculatingDistance && (
                <div className="flex items-start gap-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-4 shadow-sm">
                  <div className="bg-teal-100 rounded-full p-2">
                    <Clock className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('transfer.estimatedDuration') || 'Tahmini Süre'}</p>
                    <p className="text-lg font-bold text-teal-600 mt-1">{duration}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
                <div className="bg-blue-100 rounded-full p-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('searchForm.date')}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {format(pickupDate, "d MMMM yyyy", { locale: String(currentLanguage?.code || 'en') === 'tr' ? tr : undefined })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
                <div className="bg-orange-100 rounded-full p-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('searchForm.time')}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{pickupTime}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
                <div className="bg-purple-100 rounded-full p-2">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('searchForm.passengers')}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {passengers} {parseInt(passengers) === 1 ? t('searchForm.passenger') : t('searchForm.passengers')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Vehicles List */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🚗</span>
              {t('transfer.selectVehicle') || 'Araç Seçin'}
            </h3>
            
            <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <LoadingGif size="lg" />
              <p className="mt-4 text-lg font-medium text-gray-600">{t('loading') || 'Yükleniyor...'}</p>
              <p className="mt-2 text-sm text-gray-400">{t('transfer.searchingVehicles') || 'Müsait araçlar aranıyor...'}</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">🚫</div>
              <p className="text-lg font-semibold text-gray-700 mb-2">{t('transfer.noVehiclesAvailable') || 'Uygun araç bulunamadı'}</p>
              <p className="text-sm text-gray-500">{t('transfer.tryDifferentDates') || 'Farklı tarih veya lokasyon deneyin'}</p>
            </div>
          ) : (
            vehicles.map((vehicle, index) => (
              <div
                key={vehicle.id}
                className="group bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-orange-500 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Vehicle Image */}
                  <div className="relative w-full lg:w-64 h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0 shadow-inner">
                    <img
                      src={vehicle.image}
                      alt={vehicle.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-car.jpg';
                      }}
                    />
                    {/* Bestseller Badge */}
                    {index === 0 && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        ⭐ {t('transfer.recommended') || 'Önerilen'}
                      </div>
                    )}
                  </div>

                  {/* Vehicle Details */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{vehicle.name}</h3>
                        <p className="text-sm text-gray-500 capitalize mt-1 flex items-center gap-1">
                          <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                          {vehicle.type}
                        </p>
                      </div>
                      <div className="text-right bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{t('transfer.totalPrice') || 'Toplam Fiyat'}</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 text-transparent bg-clip-text">
                          {vehicle.price} {vehicle.currency}
                        </p>
                      </div>
                    </div>

                    {/* Capacity & Luggage */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg flex-1">
                        <span className="text-2xl">👥</span>
                        <div>
                          <p className="text-xs text-gray-500">{t('transfer.capacity') || 'Kapasite'}</p>
                          <p className="font-semibold text-gray-900">{vehicle.capacity} {t('transfer.passengers')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg flex-1">
                        <span className="text-2xl">🧳</span>
                        <div>
                          <p className="text-xs text-gray-500">{t('transfer.luggage')}</p>
                          <p className="font-semibold text-gray-900">{vehicle.luggage} {t('transfer.pieces') || 'Adet'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    {vehicle.features && vehicle.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {vehicle.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200 hover:shadow-md transition-shadow"
                          >
                            ✓ {feature}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Book Button */}
                    <div className="mt-auto pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => handleBooking(vehicle)}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <span className="mr-2">🎫</span>
                        {t('transfer.bookNow') || 'Hemen Rezervasyon Yap'}
                        <span className="ml-2">→</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;

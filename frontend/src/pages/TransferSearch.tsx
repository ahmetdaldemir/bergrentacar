import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { api } from '@/services/api';
import { Transfer, TransferSearchResponse } from '@/types/transfer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Luggage, Clock, MapPin, ArrowRight, Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import LoadingGif from '@/components/LoadingGif';
import { getApiAssetUrl } from '@/config/api';

const TransferSearch = () => {
  const { t, currentLanguage } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [searchDetails, setSearchDetails] = useState<any>(null);

  // Get search parameters from URL
  const originType = searchParams.get('originType') as 'airport' | 'hotel' | 'location';
  const originId = searchParams.get('originId');
  const destinationType = searchParams.get('destinationType') as 'airport' | 'hotel' | 'location';
  const destinationId = searchParams.get('destinationId');
  const transferDate = searchParams.get('transferDate');
  const transferTime = searchParams.get('transferTime') || '10:00';
  const passengerCount = parseInt(searchParams.get('passengerCount') || '1');
  const isRoundTrip = searchParams.get('isRoundTrip') === 'true';

  useEffect(() => {
    const fetchTransfers = async () => {
      if (!originId || !destinationId || !transferDate) {
        toast({
          variant: 'destructive',
          title: t('errors.invalidSearch'),
          description: t('errors.missingSearchParameters'),
        });
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        
        const response: TransferSearchResponse = await api.searchTransfers({
          languageId: currentLanguage?.id,
          originType,
          originId,
          destinationType,
          destinationId,
          transferDate,
          transferTime,
          passengerCount,
          isRoundTrip,
        });

        setTransfers(response.transfers || []);
        setSearchDetails(response.searchParams);
      } catch (error) {
        console.error('Error fetching transfers:', error);
        toast({
          variant: 'destructive',
          title: t('errors.fetchFailed'),
          description: t('errors.fetchTransfersFailed'),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, [originId, destinationId, transferDate, transferTime, passengerCount, isRoundTrip, currentLanguage, navigate, toast, t]);

  const getVehicleTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      sedan: t('transfer.vehicleTypes.sedan') || 'Sedan',
      van: t('transfer.vehicleTypes.van') || 'Van',
      minibus: t('transfer.vehicleTypes.minibus') || 'Minibus',
      bus: t('transfer.vehicleTypes.bus') || 'Bus',
      luxury: t('transfer.vehicleTypes.luxury') || 'Luxury',
    };
    return types[type] || type;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  const handleBookTransfer = (transfer: Transfer) => {
    // TODO: Implement booking logic
    console.log('Booking transfer:', transfer);
    toast({
      title: t('success.bookingInitiated'),
      description: t('success.bookingInitiatedDescription'),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingGif />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Search Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-gray-500">{t('transfer.from')}</p>
                  <p className="font-semibold">{searchDetails?.originType}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-gray-500">{t('transfer.to')}</p>
                  <p className="font-semibold">{searchDetails?.destinationType}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-500">{t('transfer.date')}</p>
                <p className="font-semibold">{transferDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('transfer.time')}</p>
                <p className="font-semibold">{transferTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('transfer.passengers')}</p>
                <p className="font-semibold">{passengerCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">
            {t('transfer.availableTransfers')} ({transfers.length})
          </h1>
          <p className="text-gray-600">{t('transfer.selectYourTransfer')}</p>
        </div>

        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('transfer.noResults')}</h3>
              <p className="text-gray-600 mb-6">{t('transfer.noResultsDescription')}</p>
              <Button onClick={() => navigate('/')}>{t('common.backToHome')}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {transfers.map((transfer, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {transfer.vehicle.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline">{getVehicleTypeLabel(transfer.vehicle.type)}</Badge>
                        {transfer.pricing.isNightRate && (
                          <Badge variant="secondary">{t('transfer.nightRate')}</Badge>
                        )}
                        {transfer.pricing.isRoundTrip && (
                          <Badge variant="secondary">{t('transfer.roundTrip')}</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary">
                        {transfer.pricing.totalPrice.toFixed(2)} {transfer.pricing.currencyCode}
                      </p>
                      {transfer.pricing.basePrice !== transfer.pricing.totalPrice && (
                        <p className="text-sm text-gray-500 line-through">
                          {transfer.pricing.basePrice.toFixed(2)} {transfer.pricing.currencyCode}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Vehicle Image */}
                    {transfer.vehicle.images && transfer.vehicle.images.length > 0 && (
                      <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-video">
                        <img
                          src={getApiAssetUrl(transfer.vehicle.images[0])}
                          alt={transfer.vehicle.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                    )}

                    {/* Vehicle Details */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-3">{t('transfer.routeDetails')}</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{transfer.route.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {t('transfer.duration')}: {formatDuration(transfer.route.averageDuration)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {t('transfer.distance')}: {transfer.route.distance} km
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-3">{t('transfer.vehicleCapacity')}</h4>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            <span className="font-medium">{transfer.vehicle.capacity}</span>
                            <span className="text-sm text-gray-600">{t('transfer.passengers')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Luggage className="h-5 w-5 text-primary" />
                            <span className="font-medium">{transfer.vehicle.luggage}</span>
                            <span className="text-sm text-gray-600">{t('transfer.luggage')}</span>
                          </div>
                        </div>
                      </div>

                      {transfer.vehicle.description && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-2">{t('transfer.description')}</h4>
                            <p className="text-sm text-gray-600">{transfer.vehicle.description}</p>
                          </div>
                        </>
                      )}

                      {transfer.vehicle.features && transfer.vehicle.features.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-2">{t('transfer.features')}</h4>
                            <div className="flex flex-wrap gap-2">
                              {transfer.vehicle.features.map((feature, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="bg-gray-50">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => handleBookTransfer(transfer)}
                  >
                    {t('transfer.bookNow')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferSearch;

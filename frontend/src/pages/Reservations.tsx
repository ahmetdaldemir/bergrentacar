import { useState, useEffect } from 'react';

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useToast } from '@/hooks/use-toast';
import { CustomerReservation } from '@/types/customer';
import { Loader2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Reservations = () => {
  const { t } = useTranslation();
    const [isLoadingReservations, setIsLoadingReservations] = useState(false);
    const { fetchReservations, isAuthenticated, isLoading } = useCustomerAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [reservations, setReservations] = useState<CustomerReservation[]>([]);

    useEffect(() => {
      if (!isAuthenticated && !isLoading) {
        navigate('/login');
        return;
      }
  
      if (isAuthenticated) {
        loadReservations();
          
      }
    }, [isAuthenticated, isLoading, navigate]);

    const loadReservations = async () => {
      try {
        setIsLoadingReservations(true);
        const data = await fetchReservations();
        setReservations(data);
      } catch (error: any) {
        toast({
          title: t('profile.errorLoadingReservations') || 'Hata',
          description: error.message || t('profile.failedToLoadReservations') || 'Rezervasyonlar yüklenemedi',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingReservations(false);
      }
    };


  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return t('reservation.status.confirmed') || 'Onaylandı';
      case 'pending':
        return t('reservation.status.pending') || 'Beklemede';
      case 'cancelled':
        return t('reservation.status.cancelled') || 'İptal Edildi';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewReservationDetails = (reservation: CustomerReservation) => {
    navigate(`/reservations/${reservation.id}`);
  };

  const format = (date: Date) => {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="My Reservations | Berg Rent a Car"
        description="View and manage your car rental reservations with Berg Rent a Car. Check your booking details, modify or cancel reservations."
        keywords="reservations, my bookings, car rental reservations, berg rent a car reservations"
        noindex={true}
      />
      <Header />
      
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">
          {t("bottomNav.reservations") || "Rezervasyonlar"}
        </h1>
        <p className="text-muted-foreground">
          Rezervasyonlarınız burada görüntülenecek.
        </p>
      </div>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Reservations */}
          {isLoadingReservations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : ( 
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.reservations') || 'Rezervasyonlarım'}</CardTitle>
              <CardDescription>
                {t('profile.reservationsDescription') || 'Tüm rezervasyonlarınız'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReservations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t('profile.noReservations') || 'Henüz rezervasyonunuz bulunmamaktadır'}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate('/vehicles/search')}
                  >
                    {t('profile.makeReservation') || 'Rezervasyon Yap'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {reservations.map((reservation) => (
                    <Card key={reservation.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {t('profile.reservation') || 'Rezervasyon'} #{reservation.reference}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.type') || 'Tip'}: {reservation.type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                              {getStatusText(reservation.status)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReservationDetails(reservation)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              {t('profile.viewDetails') || 'Detaylar'}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.checkIn') || 'Alış Tarihi'}
                            </p>
                            <p className="font-medium">
                              {format(new Date(reservation.checkIn), 'dd.MM.yyyy HH:mm')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.checkOut') || 'Teslim Tarihi'}
                            </p>
                            <p className="font-medium">
                              {format(new Date(reservation.checkOut), 'dd.MM.yyyy HH:mm')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.totalPrice') || 'Toplam Fiyat'}
                            </p>
                            <p className="font-medium text-lg text-primary">
                              {reservation.metadata.totalPrice.toFixed(2)} {reservation.metadata.currencyCode}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t('profile.createdAt') || 'Oluşturulma Tarihi'}
                            </p>
                            <p className="font-medium">
                              {format(new Date(reservation.createdAt), 'dd.MM.yyyy')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
        </div>
      




      <Footer />
    </div>
  );
};

export default Reservations;


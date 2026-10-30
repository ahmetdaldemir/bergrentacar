import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut, User, Mail, Phone, MapPin, Calendar, CreditCard, Lock, Edit2, Save, X, Eye, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomerReservation } from '@/types/customer';
import { api } from '@/services/api';
import { PickupLocation } from '@/types';
import { getApiAssetUrl } from '@/config/api';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { customer, profile, isAuthenticated, isLoading, logout, fetchProfile, fetchReservations, changePassword, updateProfile, cancelReservation } = useCustomerAuth();
  const { toast } = useToast();
  
  const [activeView, setActiveView] = useState<'profile' | 'reservations'>('profile');
  const [reservations, setReservations] = useState<CustomerReservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReservationDetailOpen, setIsReservationDetailOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<CustomerReservation | null>(null);
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [isCancellingReservation, setIsCancellingReservation] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobilePhone: '',
    homePhone: '',
    birthDate: '',
    homeAddress: '',
    licenseNumber: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/login');
      return;
    }

    if (isAuthenticated && customer) {
      loadReservations();
      fetchLocations();
      // Initialize edit data with current customer data
      setEditData({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        mobilePhone: customer.mobilePhone || '',
        homePhone: customer.homePhone || '',
        birthDate: customer.birthDate ? format(parseISO(customer.birthDate), 'yyyy-MM-dd') : '',
        homeAddress: customer.homeAddress || '',
        licenseNumber: customer.licenseNumber || '',
      });
    }
  }, [isAuthenticated, isLoading, navigate, customer]);

  const fetchLocations = async () => {
    try {
      const data = await api.getPickupLocations();
      
      interface ApiLocationItem {
        id?: string | number;
        locationId?: string | number;
        name?: string;
        location?: {
          id?: string | number;
          name?: string;
          parentId?: string | number | null;
          type?: string;
          children?: ApiLocationItem[];
          [key: string]: unknown;
        };
        parentId?: string | number | null;
        type?: string;
        children?: ApiLocationItem[];
        [key: string]: unknown;
      }
      
      let locationList: ApiLocationItem[] = [];
      if (Array.isArray(data)) {
        locationList = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        locationList = data.data;
      }

      const normalizeLocations = (items: ApiLocationItem[]): PickupLocation[] => {
        return items.map((item: ApiLocationItem): PickupLocation => {
          if (item.location) {
            return {
              id: item.location.id || item.id || item.locationId || 0,
              locationId: item.locationId || item.location.id || null,
              ...item.location,
              ...item,
              name: item.location.name || item.name || '',
              type: (item.location.type || item.type) as PickupLocation['type'],
              parentId: item.location.parentId ?? item.parentId ?? null,
              children: item.location.children ? normalizeLocations(item.location.children) : (item.children ? normalizeLocations(item.children) : []),
            };
          }
          return {
            id: item.id || item.locationId || 0,
            locationId: item.locationId || null,
            ...item,
            name: item.name || '',
            type: item.type as PickupLocation['type'],
            parentId: item.parentId ?? null,
            children: item.children ? normalizeLocations(item.children) : [],
          } as PickupLocation;
        });
      };

      const allLocations: PickupLocation[] = [];
      const flattenLocations = (items: PickupLocation[]) => {
        items.forEach(item => {
          allLocations.push(item);
          if (item.children && item.children.length > 0) {
            flattenLocations(item.children);
          }
        });
      };

      const normalized = normalizeLocations(locationList);
      flattenLocations(normalized);
      setLocations(allLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

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

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: t('auth.logoutSuccess') || 'Çıkış başarılı',
        description: t('auth.loggedOut') || 'Başarıyla çıkış yaptınız',
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: t('auth.logoutFailed') || 'Çıkış başarısız',
        description: error.message || t('auth.errorOccurred') || 'Bir hata oluştu',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Reset edit data to current customer data
    if (customer) {
      setEditData({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        mobilePhone: customer.mobilePhone || '',
        homePhone: customer.homePhone || '',
        birthDate: customer.birthDate ? format(parseISO(customer.birthDate), 'yyyy-MM-dd') : '',
        homeAddress: customer.homeAddress || '',
        licenseNumber: customer.licenseNumber || '',
      });
    }
  };

  const handleSave = async () => {
    if (!customer) return;

    try {
      setIsUpdating(true);
      await updateProfile(editData);
      await fetchProfile();
      setIsEditMode(false);
      toast({
        title: t('profile.updateSuccess') || 'Başarılı',
        description: t('profile.updateSuccessMessage') || 'Profil bilgileriniz başarıyla güncellendi',
      });
    } catch (error: any) {
      toast({
        title: t('profile.updateFailed') || 'Hata',
        description: error.message || t('profile.updateFailedMessage') || 'Profil bilgileri güncellenemedi',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({
        title: t('auth.passwordRequired') || 'Şifre gerekli',
        description: t('auth.pleaseFillAllFields') || 'Lütfen tüm alanları doldurun',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: t('auth.passwordsDoNotMatch') || 'Şifreler eşleşmiyor',
        description: t('auth.pleaseCheckPasswords') || 'Lütfen şifrelerin eşleştiğinden emin olun',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: t('auth.passwordMinLength') || 'Şifre çok kısa',
        description: t('auth.passwordMustBe6Chars') || 'Şifre en az 6 karakter olmalıdır',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast({
        title: t('auth.passwordChanged') || 'Şifre değiştirildi',
        description: t('auth.passwordChangedSuccess') || 'Şifreniz başarıyla değiştirildi',
      });
      setIsChangePasswordOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: t('auth.passwordChangeFailed') || 'Şifre değiştirilemedi',
        description: error.message || t('auth.errorOccurred') || 'Bir hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleViewReservationDetails = (reservation: CustomerReservation) => {
    setSelectedReservation(reservation);
    setIsReservationDetailOpen(true);
  };

  const handleCancelReservation = async () => {
    if (!selectedReservation) return;

    try {
      setIsCancellingReservation(true);
      await cancelReservation(selectedReservation.id);
      await loadReservations();
      setIsReservationDetailOpen(false);
      toast({
        title: t('profile.reservationCancelled') || 'Başarılı',
        description: t('profile.reservationCancelledSuccess') || 'Rezervasyon başarıyla iptal edildi',
      });
    } catch (error: any) {
      toast({
        title: t('profile.reservationCancelFailed') || 'Hata',
        description: error.message || t('profile.reservationCancelFailedMessage') || 'Rezervasyon iptal edilemedi',
        variant: 'destructive',
      });
    } finally {
      setIsCancellingReservation(false);
    }
  };

  const getLocationName = (locationId?: string) => {
    if (!locationId) return '-';
    const location = locations.find(loc => loc.id === locationId || loc.locationId === locationId);
    return location?.name || locationId;
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !customer || !profile) {
    return null;
  }

  return (
    <>
      <SEO 
        title={t('profile.title') || 'Profil'}
        description={t('profile.description') || 'Profil bilgileriniz ve rezervasyonlarınız'}
        noindex={true}
      />
      <Header />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('profile.title') || 'Profil'}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('profile.welcome') || 'Hoş geldiniz'}, {customer.fullName}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t('auth.logout') || 'Çıkış Yap'}
            </Button>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('profile.personalInfo') || 'Kişisel Bilgiler'}</CardTitle>
                  <CardDescription>
                    {t('profile.personalInfoDescription') || 'Profil bilgileriniz'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!isEditMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEdit}
                        className="flex items-center gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        {t('profile.edit') || 'Düzenle'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChangePasswordOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        {t('auth.changePassword') || 'Şifre Değiştir'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2"
                        disabled={isUpdating}
                      >
                        <X className="h-4 w-4" />
                        {t('common.cancel') || 'İptal'}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        className="flex items-center gap-2"
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('profile.saving') || 'Kaydediliyor...'}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            {t('profile.save') || 'Kaydet'}
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    {t('profile.firstName') || 'Ad'} *
                  </Label>
                  {isEditMode ? (
                    <Input
                      id="firstName"
                      value={editData.firstName}
                      onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                      disabled={isUpdating}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.firstName') || 'Ad'}
                        </p>
                        <p className="font-medium">{customer.firstName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    {t('profile.lastName') || 'Soyad'} *
                  </Label>
                  {isEditMode ? (
                    <Input
                      id="lastName"
                      value={editData.lastName}
                      onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                      disabled={isUpdating}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.lastName') || 'Soyad'}
                        </p>
                        <p className="font-medium">{customer.lastName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    {t('profile.email') || 'E-posta'} *
                  </Label>
                  {isEditMode ? (
                    <Input
                      id="email"
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      disabled={isUpdating}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.email') || 'E-posta'}
                        </p>
                        <p className="font-medium">{customer.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Phone */}
                <div className="space-y-2">
                  <Label htmlFor="mobilePhone">
                    {t('profile.phone') || 'Telefon'} *
                  </Label>
                  {isEditMode ? (
                    <Input
                      id="mobilePhone"
                      type="tel"
                      value={editData.mobilePhone}
                      onChange={(e) => setEditData({ ...editData, mobilePhone: e.target.value })}
                      disabled={isUpdating}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.phone') || 'Telefon'}
                        </p>
                        <p className="font-medium">{customer.mobilePhone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Home Phone */}
                {(!isEditMode && customer.homePhone) || isEditMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="homePhone">
                      {t('profile.homePhone') || 'Ev Telefonu'}
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="homePhone"
                        type="tel"
                        value={editData.homePhone}
                        onChange={(e) => setEditData({ ...editData, homePhone: e.target.value })}
                        disabled={isUpdating}
                      />
                    ) : (
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('profile.homePhone') || 'Ev Telefonu'}
                          </p>
                          <p className="font-medium">{customer.homePhone || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Birth Date */}
                {(!isEditMode && customer.birthDate) || isEditMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">
                      {t('profile.birthDate') || 'Doğum Tarihi'}
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="birthDate"
                        type="date"
                        value={editData.birthDate}
                        onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
                        disabled={isUpdating}
                      />
                    ) : (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('profile.birthDate') || 'Doğum Tarihi'}
                          </p>
                          <p className="font-medium">
                            {format(parseISO(customer.birthDate), 'dd.MM.yyyy')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Home Address */}
                {(!isEditMode && customer.homeAddress) || isEditMode ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="homeAddress">
                      {t('profile.address') || 'Adres'}
                    </Label>
                    {isEditMode ? (
                      <Textarea
                        id="homeAddress"
                        value={editData.homeAddress}
                        onChange={(e) => setEditData({ ...editData, homeAddress: e.target.value })}
                        disabled={isUpdating}
                        rows={3}
                      />
                    ) : (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('profile.address') || 'Adres'}
                          </p>
                          <p className="font-medium">{customer.homeAddress || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* License Number */}
                {(!isEditMode && customer.licenseNumber) || isEditMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">
                      {t('profile.licenseNumber') || 'Ehliyet No'}
                    </Label>
                    {isEditMode ? (
                      <Input
                        id="licenseNumber"
                        value={editData.licenseNumber}
                        onChange={(e) => setEditData({ ...editData, licenseNumber: e.target.value })}
                        disabled={isUpdating}
                      />
                    ) : (
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t('profile.licenseNumber') || 'Ehliyet No'}
                          </p>
                          <p className="font-medium">{customer.licenseNumber || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Wallet Info */}
              {profile.wallet && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-3">
                    {t('profile.wallet') || 'Cüzdan'}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('profile.balance') || 'Bakiye'}
                      </p>
                      <p className="text-xl font-bold text-primary">
                        {profile.wallet.balance.toFixed(2)} {profile.wallet.currencyCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('profile.totalEarned') || 'Toplam Kazanç'}
                      </p>
                      <p className="text-lg font-semibold">
                        {profile.wallet.totalEarned.toFixed(2)} {profile.wallet.currencyCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('profile.totalSpent') || 'Toplam Harcama'}
                      </p>
                      <p className="text-lg font-semibold">
                        {profile.wallet.totalSpent.toFixed(2)} {profile.wallet.currencyCode}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reservations */}
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
        </div>
      </div>
      <Footer />

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('auth.changePassword') || 'Şifre Değiştir'}</DialogTitle>
            <DialogDescription>
              {t('auth.changePasswordDescription') || 'Şifrenizi değiştirmek için mevcut şifrenizi giriniz'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                {t('auth.currentPassword') || 'Mevcut Şifre'} *
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                {t('auth.newPassword') || 'Yeni Şifre'} *
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t('auth.confirmPassword') || 'Yeni Şifre Tekrar'} *
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                disabled={isChangingPassword}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
                disabled={isChangingPassword}
              >
                {t('common.cancel') || 'İptal'}
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.changing') || 'Değiştiriliyor...'}
                  </>
                ) : (
                  t('auth.changePassword') || 'Şifre Değiştir'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reservation Detail Dialog */}
      <Dialog open={isReservationDetailOpen} onOpenChange={setIsReservationDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('profile.reservationDetails') || 'Rezervasyon Detayları'} #{selectedReservation?.reference}
            </DialogTitle>
            <DialogDescription>
              {t('profile.reservationDetailsDescription') || 'Rezervasyonunuzun tüm detayları'}
            </DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{t('profile.status') || 'Durum'}</p>
                  <p className="text-lg font-semibold">{getStatusText(selectedReservation.status)}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedReservation.status)}`}>
                  {getStatusText(selectedReservation.status)}
                </span>
              </div>

              {/* Dates and Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('profile.pickupInfo') || 'Alış Bilgileri'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('profile.pickupLocation') || 'Alış Lokasyonu'}</p>
                      <p className="font-medium">{getLocationName(selectedReservation.metadata.pickupLocationId)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('profile.pickupDate') || 'Alış Tarihi'}</p>
                      <p className="font-medium">{format(new Date(selectedReservation.checkIn), 'dd.MM.yyyy HH:mm')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('profile.returnInfo') || 'İade Bilgileri'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('profile.returnLocation') || 'İade Lokasyonu'}</p>
                      <p className="font-medium">{getLocationName(selectedReservation.metadata.returnLocationId)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('profile.returnDate') || 'İade Tarihi'}</p>
                      <p className="font-medium">{format(new Date(selectedReservation.checkOut), 'dd.MM.yyyy HH:mm')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('profile.customerInfo') || 'Müşteri Bilgileri'}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('profile.customerName') || 'Ad Soyad'}</p>
                    <p className="font-medium">{selectedReservation.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('profile.customerEmail') || 'E-posta'}</p>
                    <p className="font-medium">{selectedReservation.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('profile.customerPhone') || 'Telefon'}</p>
                    <p className="font-medium">{selectedReservation.customerPhone}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('profile.pricing') || 'Fiyat Bilgileri'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">{t('profile.totalPrice') || 'Toplam Fiyat'}</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedReservation.metadata.totalPrice.toFixed(2)} {selectedReservation.metadata.currencyCode}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('profile.dates') || 'Tarih Bilgileri'}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('profile.createdAt') || 'Oluşturulma Tarihi'}</p>
                    <p className="font-medium">{format(new Date(selectedReservation.createdAt), 'dd.MM.yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('profile.updatedAt') || 'Güncellenme Tarihi'}</p>
                    <p className="font-medium">{format(new Date(selectedReservation.updatedAt), 'dd.MM.yyyy HH:mm')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Cancel Button - Only show for pending reservations */}
              {selectedReservation.status.toLowerCase() === 'pending' && (
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleCancelReservation}
                    disabled={isCancellingReservation}
                    className="flex items-center gap-2"
                  >
                    {isCancellingReservation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('profile.cancelling') || 'İptal ediliyor...'}
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        {t('profile.cancelReservation') || 'Rezervasyonu İptal Et'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Profile;

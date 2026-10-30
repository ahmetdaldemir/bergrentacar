import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { customerApi } from '@/services/customerApi';
import { getTenantId } from '@/config/api';

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    idNumber: '',
    mobilePhone: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'idNumber') {
      // Only allow numbers, max 11 digits
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 11) {
        setFormData(prev => ({ ...prev, [name]: numericValue }));
        // Auto-fill password with idNumber if password is empty
        if (!formData.password) {
          setFormData(prev => ({ ...prev, password: numericValue }));
        }
      }
    } else if (name === 'mobilePhone') {
      // Format phone number
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.firstName) {
      toast({
        title: t('auth.firstNameRequired') || 'Ad gerekli',
        description: t('auth.pleaseEnterFirstName') || 'Lütfen adınızı giriniz',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.lastName) {
      toast({
        title: t('auth.lastNameRequired') || 'Soyad gerekli',
        description: t('auth.pleaseEnterLastName') || 'Lütfen soyadınızı giriniz',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.email) {
      toast({
        title: t('auth.emailRequired') || 'E-posta gerekli',
        description: t('auth.pleaseEnterEmail') || 'Lütfen e-posta adresinizi giriniz',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.idNumber || formData.idNumber.length !== 11) {
      toast({
        title: t('auth.idNumberRequired') || 'TC Kimlik No gerekli',
        description: t('auth.idNumberMustBe11Digits') || 'TC Kimlik No 11 haneli olmalıdır',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.mobilePhone || formData.mobilePhone.length < 10) {
      toast({
        title: t('auth.phoneRequired') || 'Telefon gerekli',
        description: t('auth.pleaseEnterPhone') || 'Lütfen telefon numaranızı giriniz',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      toast({
        title: t('auth.passwordRequired') || 'Şifre gerekli',
        description: t('auth.passwordMinLength') || 'Şifre en az 6 karakter olmalıdır',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t('auth.passwordsDoNotMatch') || 'Şifreler eşleşmiyor',
        description: t('auth.pleaseCheckPasswords') || 'Lütfen şifrelerin eşleştiğinden emin olun',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Note: Register endpoint might not exist in API
      // This is a placeholder - you may need to create customer during reservation
      // or add register endpoint to API
      toast({
        title: t('auth.registerInfo') || 'Bilgi',
        description: t('auth.registerDuringReservation') || 'Kayıt işlemi rezervasyon sırasında yapılabilir. Lütfen önce giriş yapmayı deneyin veya rezervasyon yaparken hesabınız oluşturulacaktır.',
        variant: 'default',
      });

      // Try to login with idNumber and password (in case user already exists)
      try {
        await customerApi.login({
          idNumber: formData.idNumber,
          password: formData.password || formData.idNumber,
          tenantId: getTenantId(),
        });

        toast({
          title: t('auth.loginSuccess') || 'Giriş başarılı',
          description: t('auth.accountExists') || 'Hesabınız zaten mevcut. Giriş yapıldı.',
        });

        navigate('/profile');
      } catch (error) {
        // Account doesn't exist - user needs to register during reservation
        toast({
          title: t('auth.registerNote') || 'Kayıt Notu',
          description: t('auth.registerDuringReservationMessage') || 'Hesabınız rezervasyon yaparken otomatik olarak oluşturulacaktır. Lütfen rezervasyon sayfasından devam edin.',
          variant: 'default',
        });
        navigate('/vehicles/search');
      }
    } catch (error: any) {
      toast({
        title: t('auth.registerFailed') || 'Kayıt başarısız',
        description: error.message || t('auth.errorOccurred') || 'Bir hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title={t('auth.register') || 'Kayıt Ol'}
        description={t('auth.registerDescription') || 'Yeni hesap oluşturun'}
        noindex={true}
      />
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {t('auth.register') || 'Kayıt Ol'}
            </CardTitle>
            <CardDescription className="text-center">
              {t('auth.createAccount') || 'Yeni hesap oluşturun'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    {t('auth.firstName') || 'Ad'} *
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    {t('auth.lastName') || 'Soyad'} *
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  {t('auth.email') || 'E-posta Adresi'} *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder') || 'ornek@email.com'}
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">
                  {t('auth.idNumber') || 'TC Kimlik No'} *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="idNumber"
                    name="idNumber"
                    type="text"
                    placeholder={t('auth.idNumberPlaceholder') || '12345678901'}
                    value={formData.idNumber}
                    onChange={handleChange}
                    className="pl-10"
                    maxLength={11}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobilePhone">
                  {t('auth.phone') || 'Telefon'} *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="mobilePhone"
                    name="mobilePhone"
                    type="tel"
                    placeholder={t('auth.phonePlaceholder') || '5551234567'}
                    value={formData.mobilePhone}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('auth.password') || 'Şifre'} *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder={t('auth.passwordPlaceholder') || 'Şifrenizi giriniz'}
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('auth.passwordHint') || 'Varsayılan şifre TC Kimlik Numaranızdır'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t('auth.confirmPassword') || 'Şifre Tekrar'} *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder={t('auth.confirmPasswordPlaceholder') || 'Şifrenizi tekrar giriniz'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.registering') || 'Kayıt yapılıyor...'}
                  </>
                ) : (
                  t('auth.register') || 'Kayıt Ol'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {t('auth.alreadyHaveAccount') || 'Zaten hesabınız var mı?'}{' '}
              </span>
              <Link
                to="/login"
                className="text-primary hover:underline font-medium"
              >
                {t('auth.login') || 'Giriş Yap'}
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t('auth.backToHome') || 'Ana Sayfaya Dön'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default Register;


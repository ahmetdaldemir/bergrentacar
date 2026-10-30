import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, User, ArrowLeft } from 'lucide-react';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { customerApi } from '@/services/customerApi';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [method, setMethod] = useState<'email' | 'idNumber'>('email');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (method === 'email' && !email) {
      toast({
        title: t('auth.emailRequired') || 'E-posta gerekli',
        description: t('auth.pleaseEnterEmail') || 'Lütfen e-posta adresinizi giriniz',
        variant: 'destructive',
      });
      return;
    }

    if (method === 'idNumber' && !idNumber) {
      toast({
        title: t('auth.idNumberRequired') || 'TC Kimlik No gerekli',
        description: t('auth.pleaseEnterIdNumber') || 'Lütfen TC Kimlik Numaranızı giriniz',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const requestData = method === 'email' ? { email } : { idNumber };
      await customerApi.forgotPassword(requestData);

      setIsSuccess(true);
      toast({
        title: t('auth.forgotPasswordSuccess') || 'Başarılı',
        description: t('auth.forgotPasswordSuccessMessage') || 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi',
      });
    } catch (error: any) {
      toast({
        title: t('auth.forgotPasswordFailed') || 'Hata',
        description: error.message || t('auth.forgotPasswordErrorMessage') || 'Şifre sıfırlama talebi gönderilemedi. Lütfen tekrar deneyin',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title={t('auth.forgotPassword') || 'Şifremi Unuttum'}
        description={t('auth.forgotPasswordDescription') || 'Şifrenizi sıfırlamak için e-posta veya TC Kimlik Numaranızı giriniz'}
        noindex
      />
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {t('auth.forgotPassword') || 'Şifremi Unuttum'}
            </CardTitle>
            <CardDescription className="text-center">
              {t('auth.forgotPasswordDescription') || 'Şifrenizi sıfırlamak için e-posta veya TC Kimlik Numaranızı giriniz'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('auth.forgotPasswordSuccess') || 'Başarılı'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('auth.forgotPasswordSuccessMessage') || 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen e-posta kutunuzu kontrol ediniz.'}
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('auth.backToLogin') || 'Giriş Sayfasına Dön'}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Method Toggle */}
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant={method === 'email' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setMethod('email')}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {t('auth.email') || 'E-posta'}
                  </Button>
                  <Button
                    type="button"
                    variant={method === 'idNumber' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setMethod('idNumber')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    {t('auth.idNumber') || 'TC Kimlik No'}
                  </Button>
                </div>

                {/* Email Input */}
                {method === 'email' && (
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      {t('auth.email') || 'E-posta Adresi'} *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder') || 'ornek@email.com'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}

                {/* ID Number Input */}
                {method === 'idNumber' && (
                  <div className="space-y-2">
                    <Label htmlFor="idNumber">
                      {t('auth.idNumber') || 'TC Kimlik No'} *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="idNumber"
                        type="text"
                        placeholder={t('auth.idNumberPlaceholder') || '12345678901'}
                        value={idNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 11) {
                            setIdNumber(value);
                          }
                        }}
                        className="pl-10"
                        maxLength={11}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.sending') || 'Gönderiliyor...'}
                    </>
                  ) : (
                    t('auth.sendResetLink') || 'Sıfırlama Bağlantısı Gönder'
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <Link
                to="/login"
                className="text-primary hover:underline font-medium inline-flex items-center"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                {t('auth.backToLogin') || 'Giriş Sayfasına Dön'}
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

export default ForgotPassword;


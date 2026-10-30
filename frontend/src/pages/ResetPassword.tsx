import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { customerApi } from '@/services/customerApi';
import { getTenantId } from '@/config/api';

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Get token and tenantId from URL parameters
    const tokenParam = searchParams.get('token');
    const tenantIdParam = searchParams.get('tenantId');
    
    if (!tokenParam) {
      toast({
        title: t('auth.invalidToken') || 'Geçersiz Token',
        description: t('auth.tokenRequired') || 'Şifre sıfırlama token\'ı bulunamadı',
        variant: 'destructive',
      });
      navigate('/forgot-password');
      return;
    }
    
    setToken(tokenParam);
    setTenantId(tenantIdParam || getTenantId());
  }, [searchParams, navigate, toast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: t('auth.passwordRequired') || 'Şifre gerekli',
        description: t('auth.passwordMinLength') || 'Şifre en az 6 karakter olmalıdır',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t('auth.passwordsDoNotMatch') || 'Şifreler eşleşmiyor',
        description: t('auth.pleaseCheckPasswords') || 'Lütfen şifrelerin eşleştiğinden emin olun',
        variant: 'destructive',
      });
      return;
    }

    if (!token) {
      toast({
        title: t('auth.invalidToken') || 'Geçersiz Token',
        description: t('auth.tokenRequired') || 'Şifre sıfırlama token\'ı bulunamadı',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await customerApi.resetPassword(token, newPassword, tenantId || undefined);

      setIsSuccess(true);
      toast({
        title: t('auth.resetPasswordSuccess') || 'Başarılı',
        description: t('auth.resetPasswordSuccessMessage') || 'Şifreniz başarıyla sıfırlandı',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      toast({
        title: t('auth.resetPasswordFailed') || 'Hata',
        description: error.message || t('auth.resetPasswordErrorMessage') || 'Şifre sıfırlanamadı. Token geçersiz veya süresi dolmuş olabilir',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return null; // Will redirect in useEffect
  }

  return (
    <>
      <SEO 
        title={t('auth.resetPassword') || 'Şifre Sıfırla'}
        description={t('auth.resetPasswordDescription') || 'Yeni şifrenizi belirleyin'}
        noindex={true}
      />
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {t('auth.resetPassword') || 'Şifre Sıfırla'}
            </CardTitle>
            <CardDescription className="text-center">
              {t('auth.resetPasswordDescription') || 'Yeni şifrenizi belirleyin'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('auth.resetPasswordSuccess') || 'Başarılı'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('auth.resetPasswordSuccessMessage') || 'Şifreniz başarıyla sıfırlandı. Giriş sayfasına yönlendiriliyorsunuz...'}
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
                {/* New Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    {t('auth.newPassword') || 'Yeni Şifre'} *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder={t('auth.passwordPlaceholder') || 'Yeni şifrenizi giriniz'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('auth.passwordMinLength') || 'Şifre en az 6 karakter olmalıdır'}
                  </p>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {t('auth.confirmPassword') || 'Yeni Şifre Tekrar'} *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t('auth.confirmPasswordPlaceholder') || 'Yeni şifrenizi tekrar giriniz'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
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
                      {t('auth.resetting') || 'Sıfırlanıyor...'}
                    </>
                  ) : (
                    t('auth.resetPassword') || 'Şifre Sıfırla'
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

export default ResetPassword;


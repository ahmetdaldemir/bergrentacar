import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useCustomerAuth();
  const { toast } = useToast();
  
  const [loginMethod, setLoginMethod] = useState<'email' | 'idNumber'>('email');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: t('auth.passwordRequired') || 'Şifre gerekli',
        description: t('auth.pleaseEnterPassword') || 'Lütfen şifrenizi giriniz',
        variant: 'destructive',
      });
      return;
    }

    if (loginMethod === 'email' && !email) {
      toast({
        title: t('auth.emailRequired') || 'E-posta gerekli',
        description: t('auth.pleaseEnterEmail') || 'Lütfen e-posta adresinizi giriniz',
        variant: 'destructive',
      });
      return;
    }

    if (loginMethod === 'idNumber' && !idNumber) {
      toast({
        title: t('auth.idNumberRequired') || 'TC Kimlik No gerekli',
        description: t('auth.pleaseEnterIdNumber') || 'Lütfen TC Kimlik Numaranızı giriniz',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await login({
        ...(loginMethod === 'email' ? { email } : { idNumber }),
        password: password || idNumber, // Default password is idNumber if not provided
      });

      toast({
        title: t('auth.loginSuccess') || 'Giriş başarılı',
        description: t('auth.welcomeBack') || 'Hoş geldiniz!',
      });

      navigate('/profile');
    } catch (error: any) {
      toast({
        title: t('auth.loginFailed') || 'Giriş başarısız',
        description: error.message || t('auth.invalidCredentials') || 'Geçersiz kullanıcı adı veya şifre',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title={t('auth.login') || 'Giriş Yap'}
        description={t('auth.loginDescription') || 'Hesabınıza giriş yapın'}
        noindex={true}
      />
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {t('auth.login') || 'Giriş Yap'}
            </CardTitle>
            <CardDescription className="text-center">
              {t('auth.loginToAccount') || 'Hesabınıza giriş yapın'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Login Method Toggle */}
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={loginMethod === 'email' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setLoginMethod('email')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t('auth.email') || 'E-posta'}
                </Button>
                <Button
                  type="button"
                  variant={loginMethod === 'idNumber' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setLoginMethod('idNumber')}
                >
                  <User className="h-4 w-4 mr-2" />
                  {t('auth.idNumber') || 'TC Kimlik No'}
                </Button>
              </div>

              {/* Email Input */}
              {loginMethod === 'email' && (
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
              {loginMethod === 'idNumber' && (
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
                          // Auto-fill password with idNumber if password is empty
                          if (!password) {
                            setPassword(value);
                          }
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

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('auth.password') || 'Şifre'} *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('auth.passwordPlaceholder') || 'Şifrenizi giriniz'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                {loginMethod === 'idNumber' && (
                  <p className="text-xs text-muted-foreground">
                    {t('auth.defaultPasswordHint') || 'Varsayılan şifre TC Kimlik Numaranızdır'}
                  </p>
                )}
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t('auth.forgotPassword') || 'Şifremi Unuttum'}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.loggingIn') || 'Giriş yapılıyor...'}
                  </>
                ) : (
                  t('auth.login') || 'Giriş Yap'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {t('auth.noAccount') || 'Hesabınız yok mu?'}{' '}
              </span>
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                {t('auth.register') || 'Kayıt Ol'}
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

export default Login;


import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  DEFAULT_COOKIE_SETTINGS,
  loadCookieSettings,
  saveCookieSettings,
} from '@/lib/googleAds';

const CookieConsentBanner = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!loadCookieSettings());
  }, [location.pathname]);

  if (!visible || location.pathname === '/cerez-ayarlari') {
    return null;
  }

  const handleAcceptAll = () => {
    saveCookieSettings({
      necessary: true,
      performance: true,
      functionality: true,
      marketing: true,
    });
    setVisible(false);
  };

  const handleRejectAll = () => {
    saveCookieSettings(DEFAULT_COOKIE_SETTINGS);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-[120] p-3 md:p-4 pointer-events-none">
      <div className="container mx-auto pointer-events-auto">
        <div className="rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              {t('cerezAyarlari.bannerMessage')}{' '}
              <Link
                to="/cerez-aydinlatma-politikasi"
                className="text-primary underline underline-offset-2"
              >
                {t('cerezAydinlatmaPolitikasi.title')}
              </Link>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button onClick={handleAcceptAll} size="sm">
              {t('cerezAyarlari.acceptAll')}
            </Button>
            <Button onClick={handleRejectAll} variant="outline" size="sm">
              {t('cerezAyarlari.rejectAll')}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/cerez-ayarlari">{t('cerezAyarlari.customize')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Cookie, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveCookieSettings, loadCookieSettings, DEFAULT_COOKIE_SETTINGS, type CookieSettings } from "@/lib/googleAds";

const CerezAyarlari = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [cookieSettings, setCookieSettings] = useState<CookieSettings>(DEFAULT_COOKIE_SETTINGS);

  useEffect(() => {
    const savedSettings = loadCookieSettings();
    if (savedSettings) {
      setCookieSettings(savedSettings);
    }
  }, []);

  const handleToggle = (key: keyof typeof cookieSettings) => {
    if (key === 'necessary') return; // Zorunlu çerezler kapatılamaz
    
    setCookieSettings({
      ...cookieSettings,
      [key]: !cookieSettings[key],
    });
  };

  const handleSave = () => {
    saveCookieSettings(cookieSettings);
    toast({
      title: t('cerezAyarlari.settingsSaved'),
      description: t('cerezAyarlari.settingsSavedDesc'),
    });
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      performance: true,
      functionality: true,
      marketing: true,
    };
    setCookieSettings(allAccepted);
    saveCookieSettings(allAccepted);
    toast({
      title: t('cerezAyarlari.allAccepted'),
      description: t('cerezAyarlari.allAcceptedDesc'),
    });
  };

  const handleRejectAll = () => {
    const onlyNecessary = DEFAULT_COOKIE_SETTINGS;
    setCookieSettings(onlyNecessary);
    saveCookieSettings(onlyNecessary);
    toast({
      title: t('cerezAyarlari.settingsUpdated'),
      description: t('cerezAyarlari.settingsUpdatedDesc'),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('cerezAyarlari.title')} | Berg Rent a Car`}
        description={`${t('cerezAyarlari.title')} - ${t('cerezAyarlari.subtitle')}`}
        keywords="çerez ayarları, cookie settings, çerez yönetimi"
        noindex={true}
      />
      <Header />

      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex justify-center mb-4">
              <Cookie className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {t('cerezAyarlari.title')}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              {t('cerezAyarlari.subtitle')}
            </p>
          </div>

          {/* Info Card */}
          <Card className="mb-6 sm:mb-8">
            <CardContent className="pt-6">
              <p className="text-base sm:text-lg leading-relaxed">
                {t('cerezAyarlari.info')}
              </p>
            </CardContent>
          </Card>

          {/* Cookie Categories */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('cerezAyarlari.categories')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Necessary Cookies */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Label htmlFor="necessary" className="text-lg font-semibold cursor-pointer">
                      {t('cerezAyarlari.necessary.title')}
                    </Label>
                    <Switch
                      id="necessary"
                      checked={cookieSettings.necessary}
                      disabled
                      onCheckedChange={() => {}}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('cerezAyarlari.necessary.description')}
                  </p>
                </div>
              </div>

              {/* Performance Cookies */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Label htmlFor="performance" className="text-lg font-semibold cursor-pointer">
                      {t('cerezAyarlari.performance.title')}
                    </Label>
                    <Switch
                      id="performance"
                      checked={cookieSettings.performance}
                      onCheckedChange={() => handleToggle('performance')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('cerezAyarlari.performance.description')}
                  </p>
                </div>
              </div>

              {/* Functionality Cookies */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Label htmlFor="functionality" className="text-lg font-semibold cursor-pointer">
                      {t('cerezAyarlari.functionality.title')}
                    </Label>
                    <Switch
                      id="functionality"
                      checked={cookieSettings.functionality}
                      onCheckedChange={() => handleToggle('functionality')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('cerezAyarlari.functionality.description')}
                  </p>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Label htmlFor="marketing" className="text-lg font-semibold cursor-pointer">
                      {t('cerezAyarlari.marketing.title')}
                    </Label>
                    <Switch
                      id="marketing"
                      checked={cookieSettings.marketing}
                      onCheckedChange={() => handleToggle('marketing')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('cerezAyarlari.marketing.description')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Button
              onClick={handleAcceptAll}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {t('cerezAyarlari.acceptAll')}
            </Button>
            <Button
              onClick={handleRejectAll}
              variant="outline"
              className="flex-1"
            >
              {t('cerezAyarlari.rejectAll')}
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {t('cerezAyarlari.save')}
            </Button>
          </div>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">
                {t('cerezAyarlari.moreInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('cerezAyarlari.moreInfoContent')}
              </p>
              <ul className="space-y-2 text-base leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>
                    {t('cerezAyarlari.moreInfoItem1')}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>
                    {t('cerezAyarlari.moreInfoItem2')}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>
                    {t('cerezAyarlari.moreInfoItem3')}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CerezAyarlari;


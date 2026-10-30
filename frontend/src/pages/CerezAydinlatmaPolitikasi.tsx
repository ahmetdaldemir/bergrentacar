import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie } from "lucide-react";

const CerezAydinlatmaPolitikasi = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('cerezAydinlatmaPolitikasi.title')} | Berg Rent a Car`}
        description={`${t('cerezAydinlatmaPolitikasi.title')} - ${t('cerezAydinlatmaPolitikasi.subtitle')}`}
        keywords="çerez politikası, cookie policy, çerez ayarları, web çerezleri"
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
              {t('cerezAydinlatmaPolitikasi.title')}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              {t('cerezAydinlatmaPolitikasi.subtitle')}
            </p>
          </div>

          {/* Content */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('cerezAydinlatmaPolitikasi.whatIsCookie.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('cerezAydinlatmaPolitikasi.whatIsCookie.content1')}
              </p>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('cerezAydinlatmaPolitikasi.whatIsCookie.content2')}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('cerezAydinlatmaPolitikasi.cookieTypes.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">{t('cerezAydinlatmaPolitikasi.cookieTypes.necessary.title')}</h3>
                  <p className="text-base sm:text-lg leading-relaxed mb-3">
                    {t('cerezAydinlatmaPolitikasi.cookieTypes.necessary.content1')}
                  </p>
                  <ul className="space-y-2 text-base leading-relaxed">
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{t('cerezAydinlatmaPolitikasi.cookieTypes.necessary.item1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{t('cerezAydinlatmaPolitikasi.cookieTypes.necessary.item2')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{t('cerezAydinlatmaPolitikasi.cookieTypes.necessary.item3')}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">{t('cerezAydinlatmaPolitikasi.cookieTypes.performance.title')}</h3>
                  <p className="text-base sm:text-lg leading-relaxed mb-3">
                    {t('cerezAydinlatmaPolitikasi.cookieTypes.performance.content1')}
                  </p>
                  <ul className="space-y-2 text-base leading-relaxed">
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{t('cerezAydinlatmaPolitikasi.cookieTypes.performance.item1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{t('cerezAydinlatmaPolitikasi.cookieTypes.performance.item2')}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">{t('cerezAydinlatmaPolitikasi.cookieTypes.functionality.title')}</h3>
                  <p className="text-base sm:text-lg leading-relaxed mb-3">
                    {t('cerezAydinlatmaPolitikasi.cookieTypes.functionality.content1')}
                  </p>
                  <ul className="space-y-2 text-base leading-relaxed">
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{t('cerezAydinlatmaPolitikasi.cookieTypes.functionality.item1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{t('cerezAydinlatmaPolitikasi.cookieTypes.functionality.item2')}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">{t('cerezAydinlatmaPolitikasi.cookieTypes.marketing.title')}</h3>
                  <p className="text-base sm:text-lg leading-relaxed mb-3">
                    {t('cerezAydinlatmaPolitikasi.cookieTypes.marketing.content1')}
                  </p>
                  <ul className="space-y-2 text-base leading-relaxed">
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{t('cerezAydinlatmaPolitikasi.cookieTypes.marketing.item1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{t('cerezAydinlatmaPolitikasi.cookieTypes.marketing.item2')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('cerezAydinlatmaPolitikasi.cookieDurations.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('cerezAydinlatmaPolitikasi.cookieDurations.content1')}
              </p>
              <ul className="space-y-2 text-base leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('cerezAydinlatmaPolitikasi.cookieDurations.session')}</strong> {t('cerezAydinlatmaPolitikasi.cookieDurations.sessionDesc')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('cerezAydinlatmaPolitikasi.cookieDurations.persistent')}</strong> {t('cerezAydinlatmaPolitikasi.cookieDurations.persistentDesc')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('cerezAydinlatmaPolitikasi.manageCookies.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('cerezAydinlatmaPolitikasi.manageCookies.content1')}
              </p>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('cerezAydinlatmaPolitikasi.manageCookies.content2')}
              </p>
              <ul className="space-y-2 text-base leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('cerezAydinlatmaPolitikasi.manageCookies.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('cerezAydinlatmaPolitikasi.manageCookies.item2')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('cerezAydinlatmaPolitikasi.thirdPartyCookies.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('cerezAydinlatmaPolitikasi.thirdPartyCookies.content1')}
              </p>
              <ul className="space-y-2 text-base leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('cerezAydinlatmaPolitikasi.thirdPartyCookies.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('cerezAydinlatmaPolitikasi.thirdPartyCookies.item2')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('cerezAydinlatmaPolitikasi.updates.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('cerezAydinlatmaPolitikasi.updates.content1')}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('cerezAydinlatmaPolitikasi.contact.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('cerezAydinlatmaPolitikasi.contact.content1')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CerezAydinlatmaPolitikasi;


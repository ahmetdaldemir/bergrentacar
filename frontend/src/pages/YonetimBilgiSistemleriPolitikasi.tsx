import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server } from "lucide-react";

const YonetimBilgiSistemleriPolitikasi = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('yonetimBilgiSistemleriPolitikasi.title')} | Berg Rent a Car`}
        description={`${t('yonetimBilgiSistemleriPolitikasi.title')} - ${t('yonetimBilgiSistemleriPolitikasi.subtitle')}`}
        keywords="bilgi güvenliği, yönetim bilgi sistemleri, sistem politikası, IT güvenlik"
      />
      <Header />

      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex justify-center mb-4">
              <Server className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {t('yonetimBilgiSistemleriPolitikasi.title')}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              {t('yonetimBilgiSistemleriPolitikasi.subtitle')}
            </p>
          </div>

          {/* Content */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.scope.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('yonetimBilgiSistemleriPolitikasi.scope.content1')}
              </p>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('yonetimBilgiSistemleriPolitikasi.scope.content2')}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.securityPrinciples.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-3">{t('yonetimBilgiSistemleriPolitikasi.securityPrinciples.confidentiality.title')}</h3>
                  <p className="text-base sm:text-lg leading-relaxed">
                    {t('yonetimBilgiSistemleriPolitikasi.securityPrinciples.confidentiality.content')}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">{t('yonetimBilgiSistemleriPolitikasi.securityPrinciples.integrity.title')}</h3>
                  <p className="text-base sm:text-lg leading-relaxed">
                    {t('yonetimBilgiSistemleriPolitikasi.securityPrinciples.integrity.content')}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">{t('yonetimBilgiSistemleriPolitikasi.securityPrinciples.availability.title')}</h3>
                  <p className="text-base sm:text-lg leading-relaxed">
                    {t('yonetimBilgiSistemleriPolitikasi.securityPrinciples.availability.content')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.technicalMeasures.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('yonetimBilgiSistemleriPolitikasi.technicalMeasures.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.technicalMeasures.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.technicalMeasures.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.technicalMeasures.item3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.technicalMeasures.item4')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.technicalMeasures.item5')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.technicalMeasures.item6')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.technicalMeasures.item7')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.accessControl.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('yonetimBilgiSistemleriPolitikasi.accessControl.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.accessControl.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.accessControl.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.accessControl.item3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.accessControl.item4')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.accessControl.item5')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.backupRecovery.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('yonetimBilgiSistemleriPolitikasi.backupRecovery.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.backupRecovery.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.backupRecovery.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.backupRecovery.item3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.backupRecovery.item4')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.backupRecovery.item5')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.incidentResponse.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('yonetimBilgiSistemleriPolitikasi.incidentResponse.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.incidentResponse.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.incidentResponse.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.incidentResponse.item3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.incidentResponse.item4')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.incidentResponse.item5')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.staffTraining.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('yonetimBilgiSistemleriPolitikasi.staffTraining.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.staffTraining.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.staffTraining.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.staffTraining.item3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.staffTraining.item4')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.thirdParty.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('yonetimBilgiSistemleriPolitikasi.thirdParty.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.thirdParty.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.thirdParty.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.thirdParty.item3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('yonetimBilgiSistemleriPolitikasi.thirdParty.item4')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.updates.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('yonetimBilgiSistemleriPolitikasi.updates.content1')}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('yonetimBilgiSistemleriPolitikasi.contact.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('yonetimBilgiSistemleriPolitikasi.contact.content1')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default YonetimBilgiSistemleriPolitikasi;


import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const AydinlatmaMetni = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('aydinlatmaMetni.title')} | Berg Rent a Car`}
        description={`${t('aydinlatmaMetni.title')} - ${t('aydinlatmaMetni.subtitle')}`}
        keywords="aydınlatma metni, kişisel veriler, KVKK, veri koruma"
      />
      <Header />

      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex justify-center mb-4">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {t('aydinlatmaMetni.title')}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              {t('aydinlatmaMetni.subtitle')}
            </p>
          </div>

          {/* Content */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('aydinlatmaMetni.dataController.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('aydinlatmaMetni.dataController.content1')}
              </p>
              <p className="text-base sm:text-lg leading-relaxed">
                <strong>{t('aydinlatmaMetni.dataController.dataController')}</strong> Berg Rent a Car<br />
                <strong>{t('aydinlatmaMetni.dataController.address')}</strong> {t('aydinlatmaMetni.dataController.contactInfo')}<br />
                <strong>{t('aydinlatmaMetni.dataController.email')}</strong> {t('aydinlatmaMetni.dataController.contactInfo')}<br />
                <strong>{t('aydinlatmaMetni.dataController.phone')}</strong> {t('aydinlatmaMetni.dataController.contactInfo')}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('aydinlatmaMetni.processedData.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('aydinlatmaMetni.processedData.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('aydinlatmaMetni.processedData.identityInfo')}</strong> {t('aydinlatmaMetni.processedData.identityInfoDesc')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('aydinlatmaMetni.processedData.contactInfo')}</strong> {t('aydinlatmaMetni.processedData.contactInfoDesc')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('aydinlatmaMetni.processedData.licenseInfo')}</strong> {t('aydinlatmaMetni.processedData.licenseInfoDesc')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('aydinlatmaMetni.processedData.reservationInfo')}</strong> {t('aydinlatmaMetni.processedData.reservationInfoDesc')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('aydinlatmaMetni.processedData.technicalData')}</strong> {t('aydinlatmaMetni.processedData.technicalDataDesc')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('aydinlatmaMetni.processingPurposes.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('aydinlatmaMetni.processingPurposes.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.processingPurposes.purpose1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.processingPurposes.purpose2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.processingPurposes.purpose3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.processingPurposes.purpose4')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.processingPurposes.purpose5')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('aydinlatmaMetni.dataTransfer.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('aydinlatmaMetni.dataTransfer.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataTransfer.transfer1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataTransfer.transfer2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataTransfer.transfer3')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('aydinlatmaMetni.dataSubjectRights.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('aydinlatmaMetni.dataSubjectRights.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataSubjectRights.right1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataSubjectRights.right2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataSubjectRights.right3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataSubjectRights.right4')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataSubjectRights.right5')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataSubjectRights.right6')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataSubjectRights.right7')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataSubjectRights.right8')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('aydinlatmaMetni.dataSubjectRights.right9')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('aydinlatmaMetni.contact.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('aydinlatmaMetni.contact.content1')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AydinlatmaMetni;

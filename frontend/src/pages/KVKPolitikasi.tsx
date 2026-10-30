import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

const KVKPolitikasi = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('kvkPolitikasi.title')} | Berg Rent a Car`}
        description={`${t('kvkPolitikasi.title')} - ${t('kvkPolitikasi.subtitle')}`}
        keywords="KVKK, kişisel verilerin korunması, veri güvenliği, gizlilik politikası"
      />
      <Header />

      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {t('kvkPolitikasi.title')}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              {t('kvkPolitikasi.subtitle')}
            </p>
          </div>

          {/* Content */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('kvkPolitikasi.generalInfo.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('kvkPolitikasi.generalInfo.content1')}
              </p>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('kvkPolitikasi.generalInfo.content2')}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('kvkPolitikasi.dataSecurity.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('kvkPolitikasi.dataSecurity.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.dataSecurity.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.dataSecurity.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.dataSecurity.item3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.dataSecurity.item4')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.dataSecurity.item5')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.dataSecurity.item6')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('kvkPolitikasi.dataRetention.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('kvkPolitikasi.dataRetention.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('kvkPolitikasi.dataRetention.reservation')}</strong> {t('kvkPolitikasi.dataRetention.reservationDesc')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('kvkPolitikasi.dataRetention.contact')}</strong> {t('kvkPolitikasi.dataRetention.contactDesc')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('kvkPolitikasi.dataRetention.marketing')}</strong> {t('kvkPolitikasi.dataRetention.marketingDesc')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>{t('kvkPolitikasi.dataRetention.technical')}</strong> {t('kvkPolitikasi.dataRetention.technicalDesc')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('kvkPolitikasi.dataBreach.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('kvkPolitikasi.dataBreach.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.dataBreach.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.dataBreach.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.dataBreach.item3')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('kvkPolitikasi.legalBasis.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('kvkPolitikasi.legalBasis.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.legalBasis.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.legalBasis.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.legalBasis.item3')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.legalBasis.item4')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('kvkPolitikasi.internationalTransfer.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('kvkPolitikasi.internationalTransfer.content1')}
              </p>
              <ul className="space-y-3 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.internationalTransfer.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.internationalTransfer.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.internationalTransfer.item3')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('kvkPolitikasi.updates.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('kvkPolitikasi.updates.content1')}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('kvkPolitikasi.contact.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('kvkPolitikasi.contact.content1')}
              </p>
              <ul className="space-y-2 text-base leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.contact.item1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.contact.item2')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('kvkPolitikasi.contact.item3')}</span>
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

export default KVKPolitikasi;


import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CompanyInfo = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('companyInfo.title')} | Berg Rent a Car`}
        description={t('companyInfo.seoDescription')}
        keywords={t('companyInfo.seoKeywords')}
      />
      <Header />

      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {t('companyInfo.title')}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              {t('companyInfo.subtitle')}
            </p>
          </div>

          {/* Introduction */}
          <Card className="mb-6 sm:mb-8">
            <CardContent className="pt-6">
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                {t('companyInfo.introduction')}
              </p>
              <p className="text-base sm:text-lg leading-relaxed">
                {t('companyInfo.approach')}
              </p>
            </CardContent>
          </Card>

          {/* Mission */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('companyInfo.mission.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 text-base sm:text-lg leading-relaxed">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('companyInfo.mission.description1')}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>{t('companyInfo.mission.description2')}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Vision */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-2xl sm:text-3xl">
                {t('companyInfo.vision.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-base sm:text-lg leading-relaxed">
                <p>{t('companyInfo.vision.description1')}</p>
                <p>{t('companyInfo.vision.description2')}</p>
                <p>{t('companyInfo.vision.description3')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CompanyInfo;


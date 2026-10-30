import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchForm from "@/components/SearchForm";
import CarCategories from "@/components/CarCategories";
import Features from "@/components/Features";
import Destinations from "@/components/Destinations";
import Blog from "@/components/Blog";
import Reviews from "@/components/Reviews";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import trTranslations from '@/locales/tr.json';
import enTranslations from '@/locales/en.json';
import deTranslations from '@/locales/de.json';
import ruTranslations from '@/locales/ru.json';

const translations: Record<string, any> = {
  tr: trTranslations,
  en: enTranslations,
  de: deTranslations,
  ru: ruTranslations,
};

const Index = () => {
  const { t, currentLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<'rental' | 'transfer'>('rental');
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  
  // Get hero slides based on current language
  const langCode = currentLanguage?.code || 'tr';
  const heroSlides = (translations[langCode]?.hero?.slides as string[]) || translations['tr']?.hero?.slides || [
    "Araç Kiralamada Güvenilir ve Net Fiyatlar",
    "Doğrudan Kiralama, Şeffaf Fiyatlandırma",
    "Sürprizsiz Araç Kiralama Deneyimi"
  ];
  
  // Rotate hero slides every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);
  
  // Determine image based on active tab
  const heroImage = activeTab === 'transfer' ? '/transfer.jpeg' : '/rentacar.jpeg';

  const handleReservationClick = () => {
    // Scroll to search form (hero section)
    const heroSection = document.querySelector('section.relative.bg-primary.text-primary-foreground');
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t('seo.home.title') || 'Berg Rent a Car | The best car rental company in Turkey | ANTALYA | ALANYA'}
        description={t('seo.home.description') || 'Berg Rent a Car - Turkey\'s most trusted car rental company. Rent a car in Antalya, Alanya and throughout Turkey. Best prices, quality service, wide vehicle fleet. Compare prices and find the perfect car for your trip.'}
        keywords={t('seo.home.keywords') || 'car rental, rent a car, turkey, antalya, alanya, berg rent a car, araç kiralama, türkiye, car rental comparison, cheap car rental'}
      />
      <Header />

      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground py-16">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage: "url('/hero-bg.png')",
          }}
        ></div>

        <div className="relative container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1 w-full lg:max-w-3xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 min-h-[3rem] sm:min-h-[4rem] md:min-h-[5rem] flex items-center transition-opacity duration-500">
                {Array.isArray(heroSlides) && heroSlides[heroSlideIndex] ? heroSlides[heroSlideIndex] : t('hero.title')}
              </h1>
              <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90">
                {t('hero.subtitle')}
              </p>
              {/* Search Form - Left Side */}
              <SearchForm onTabChange={setActiveTab} />
            </div>

            {/* Right Side - Car Image and Features */}
            <div className="flex-1 relative hidden lg:flex justify-end">
              <div className="relative">
                <img
                  src={heroImage}
                  alt={activeTab === 'transfer' ? t('searchForm.transferSearch') : t('searchForm.rentalCarSearch')}
                  className="w-full max-w-lg rounded-lg"
                  onError={(e) => {
                    // Fallback to default image if file doesn't exist
                    (e.target as HTMLImageElement).src = '/rentacar.jpeg';
                  }}
                />
 
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <Features />
      {/* Car Categories */}
      {/*<CarCategories />*/}

      {/* Blog Section */}
      <Blog />

      {/* Destinations Section */}
      <Destinations />

      {/* Reviews Section */}
      <Reviews />

      {/* CTA Section */}
      <section className="py-12 sm:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t('cta.title')}</h2>
          <p className="text-base sm:text-xl mb-6 sm:mb-8 opacity-90 px-4">
            {t('cta.description')}
          </p>
          <button 
            onClick={handleReservationClick}
            className="bg-background text-primary px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:bg-background/90 transition-colors text-sm sm:text-base"
          >
            {t('cta.button')}
          </button>
        </div>
      </section>

      {/* Company Information Section - Accordion */}
 
        <section className="py-10 md:py-10 bg-white">
        <div className="container mx-auto px-4">
          <Card>
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="company-info">
                  <AccordionTrigger className="text-left text-xl font-bold">
                    {t('companyInfo.accordionTitle') || 'Şirket Bilgileri'}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose max-w-none text-gray-700 leading-relaxed space-y-6 pt-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                          {t('companyInfo.title')}
                        </h2>
                        <p className="text-base leading-7">{t('companyInfo.intro')}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {t('companyInfo.whyTitle')}
                        </h3>
                        <p className="text-base leading-7">{t('companyInfo.whyContent')}</p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {t('companyInfo.serviceTitle')}
                        </h3>
                        <p className="text-base leading-7 mb-3">{t('companyInfo.serviceContent1')}</p>
                        <p className="text-base leading-7">{t('companyInfo.serviceContent2')}</p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {t('companyInfo.fleetTitle')}
                        </h3>
                        <p className="text-base leading-7 mb-3">{t('companyInfo.fleetContent1')}</p>
                        <ul className="list-disc list-inside space-y-2 mb-3 text-base">
                          <li>{t('companyInfo.fleetItem1')}</li>
                          <li>{t('companyInfo.fleetItem2')}</li>
                          <li>{t('companyInfo.fleetItem3')}</li>
                        </ul>
                        <p className="text-base leading-7">{t('companyInfo.fleetContent2')}</p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {t('companyInfo.onlineTitle')}
                        </h3>
                        <p className="text-base leading-7 mb-3">{t('companyInfo.onlineContent1')}</p>
                        <ul className="list-disc list-inside space-y-2 mb-3 text-base">
                          <li>{t('companyInfo.onlineItem1')}</li>
                          <li>{t('companyInfo.onlineItem2')}</li>
                          <li>{t('companyInfo.onlineItem3')}</li>
                          <li>{t('companyInfo.onlineItem4')}</li>
                        </ul>
                        <p className="text-base leading-7">{t('companyInfo.onlineContent2')}</p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {t('companyInfo.supportTitle')}
                        </h3>
                        <p className="text-base leading-7">{t('companyInfo.supportContent')}</p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {t('companyInfo.rentalPeriodsTitle')}
                        </h3>
                        <p className="text-base leading-7 mb-3">{t('companyInfo.rentalPeriodsContent1')}</p>
                        <ul className="list-disc list-inside space-y-2 mb-3 text-base">
                          <li>{t('companyInfo.rentalPeriodsItem1')}</li>
                          <li>{t('companyInfo.rentalPeriodsItem2')}</li>
                          <li>{t('companyInfo.rentalPeriodsItem3')}</li>
                        </ul>
                        <p className="text-base leading-7">{t('companyInfo.rentalPeriodsContent2')}</p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {t('companyInfo.safetyTitle')}
                        </h3>
                        <p className="text-base leading-7">{t('companyInfo.safetyContent')}</p>
                      </div>

                      <p className="text-lg font-semibold text-gray-900 mt-6">
                        {t('companyInfo.cta')}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;

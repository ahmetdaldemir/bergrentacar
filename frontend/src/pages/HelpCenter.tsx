import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { HelpCircle, BookOpen, MessageSquare, FileText, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HelpCenter = () => {
  const { t } = useTranslation();

  const helpSections = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: t('helpCenter.booking.title'),
      description: t('helpCenter.booking.description'),
      link: '/contact-us',
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: t('helpCenter.policies.title'),
      description: t('helpCenter.policies.description'),
      link: '/faq',
    },
    {
      icon: <HelpCircle className="h-6 w-6" />,
      title: t('helpCenter.general.title'),
      description: t('helpCenter.general.description'),
      link: '/faq',
    },
    {
      icon: <Phone className="h-6 w-6" />,
      title: t('helpCenter.contact.title'),
      description: t('helpCenter.contact.description'),
      link: '/contact-us',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('header.helpCenter')} | Berg Rent a Car`}
        description={t('helpCenter.seoDescription')}
        keywords={t('helpCenter.seoKeywords')}
      />
      <Header />
      
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{t('header.helpCenter')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('helpCenter.subtitle')}
          </p>
        </div>

        {/* Help Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {helpSections.map((section, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="text-primary">
                    {section.icon}
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={section.link}>
                  <Button variant="outline" className="w-full">
                    {t('helpCenter.learnMore')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>{t('header.liveChat')}</span>
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {t('helpCenter.liveChatDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/live-chat">
                <Button variant="secondary" className="w-full">
                  {t('helpCenter.startChat')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>{t('header.contactUs')}</span>
              </CardTitle>
              <CardDescription>
                {t('helpCenter.contactDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/contact-us">
                <Button className="w-full">
                  {t('helpCenter.contactUs')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HelpCenter;


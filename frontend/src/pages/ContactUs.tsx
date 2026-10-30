import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";
import { useState, useEffect } from "react";
import { Phone, Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { createContactEmailTemplate } from "@/utils/emailTemplate";

const ContactUs = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('Berg Rent a Car');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  // Fetch contact info from tenant settings
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const data = await api.getStaticData();
        if (data && data.settings?.site) {
          if (data.settings.site.companyPhone) {
            setPhone(data.settings.site.companyPhone);
          }
          if (data.settings.site.companyEmail) {
            setEmail(data.settings.site.companyEmail);
          }
          if (data.settings.site.companyAddress) {
            setAddress(data.settings.site.companyAddress);
          }
          if (data.settings.site.companyName) {
            setCompanyName(data.settings.site.companyName);
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    fetchStaticData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create HTML email template
      const htmlContent = createContactEmailTemplate({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        companyName,
        companyEmail: email || undefined,
      });

      // Send email to company email address
      if (email) {
        await api.sendEmail({
          to: email,
          subject: `Contact Form: ${formData.subject}`,
          html: htmlContent,
        });

        // Show success message
        toast({
          title: t('contactUs.send'),
          description: t('contactUs.successMessage') || 'Your message has been sent successfully!',
        });

        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
        });
      } else {
        throw new Error('Company email not found');
      }
    } catch (error) {
      // Show error message
      toast({
        title: t('contactUs.error') || 'Error',
        description: error instanceof Error ? error.message : t('contactUs.errorMessage') || 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t('header.contactUs')} | Berg Rent a Car`}
        description={t('contactUs.seoDescription')}
        keywords={t('contactUs.seoKeywords')}
      />
      <Header />
      
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{t('header.contactUs')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('contactUs.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('contactUs.contactInfo')}</CardTitle>
                <CardDescription>{t('contactUs.contactInfoDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {phone && (
                  <div className="flex items-start space-x-4">
                    <Phone className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <p className="font-semibold">{t('contactUs.phone')}</p>
                      <a href={`tel:${phone}`} className="text-primary hover:underline">
                        {phone}
                      </a>
                    </div>
                  </div>
                )}
                
                {email && (
                  <div className="flex items-start space-x-4">
                    <Mail className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <p className="font-semibold">{t('contactUs.email')}</p>
                      <a href={`mailto:${email}`} className="text-primary hover:underline">
                        {email}
                      </a>
                    </div>
                  </div>
                )}

                {address && (
                  <div className="flex items-start space-x-4">
                    <MapPin className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <p className="font-semibold">{t('contactUs.address')}</p>
                      <div dangerouslySetInnerHTML={{ __html: address }} className="text-muted-foreground" />
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-4">
                  <Clock className="h-5 w-5 mt-1 text-primary" />
                  <div>
                    <p className="font-semibold">{t('contactUs.businessHours')}</p>
                    <p className="text-muted-foreground">{t('contactUs.businessHoursDetail')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>{t('header.liveChat')}</span>
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  {t('contactUs.liveChatDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/live-chat">
                  <Button variant="secondary" className="w-full">
                    {t('contactUs.startChat')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('contactUs.sendMessage')}</CardTitle>
              <CardDescription>{t('contactUs.sendMessageDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('contactUs.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">{t('contactUs.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="subject">{t('contactUs.subject')}</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">{t('contactUs.message')}</Label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (t('contactUs.sending') || 'Sending...') : t('contactUs.send')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactUs;


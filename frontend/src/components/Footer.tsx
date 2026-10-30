import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "@/contexts/TranslationContext";
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { site } from "@/seo/schema";

const Footer = () => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const getLocalizedUrl = (path: string): string => path;

  // Fetch tenant settings for contact information
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const data = await api.getStaticData();
        if (data && data.settings?.site) {
          // Set phone from settings.site.companyPhone
          if (data.settings.site.companyPhone) {
            setPhone(data.settings.site.companyPhone);
          }
          // Set email from settings.site.companyEmail
          if (data.settings.site.companyEmail) {
            setEmail(data.settings.site.companyEmail);
          }
          // Set address from settings.site.companyAddress
          if (data.settings.site.companyAddress) {
            setAddress(data.settings.site.companyAddress);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching static data:', error);
        }
      }
    };

    fetchStaticData();
  }, []);

  // WhatsApp message with pre-filled text
  const whatsappMessage = t('floatingButtons.whatsappMessage') || "Hi Berg Rent A Car Alanya!";
  const whatsappUrl = `https://wa.me/${site.telephone.replace('+', '')}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <footer className="bg-primary text-primary-foreground pb-20 md:pb-8 sm:pb-12">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {/* Company Info */}
          <div className="col-span-2 md:col-span-2 lg:col-span-1 pb-4 mb-4 border-b border-white md:border-b-0 md:pb-0 md:mb-0">
          <img 
                src={"/berglogo22.png"} 
                alt="Berg Rent A Car Alanya" 
                className="h-10 sm:h-8 lg:h-20 w-auto"
              />
            <p className="mb-4 text-sm sm:text-base text-primary-foreground/80">
              {t('footer.companyDescription')}
            </p>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Instagram className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="pb-4 mb-4 border-b border-white md:border-b-0 md:pb-0 md:mb-0">
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm sm:text-base text-primary-foreground/80">
              <li>
                <Link to={getLocalizedUrl("/")} className="hover:text-primary-foreground transition-colors">
                  {t('footer.home')}
                </Link>
              </li>
              {/* Only show links for existing pages - other pages return 404 */}
              {/* Uncomment when these pages are created:
              <li>
                <Link to={getLocalizedUrl("/cars")} className="hover:text-primary-foreground transition-colors">
                  {t('footer.carCategories')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedUrl("/locations")} className="hover:text-primary-foreground transition-colors">
                  {t('footer.locations')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedUrl("/company-info")} className="hover:text-primary-foreground transition-colors">
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedUrl("/faq")} className="hover:text-primary-foreground transition-colors">
                  {t('footer.faq')}
                </Link>
              </li>
              */}
            </ul>
          </div>

          {/* Legal & Policies */}
          <div className="pb-4 mb-4 border-b border-white md:border-b-0 md:pb-0 md:mb-0">
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('footer.legalPolicies') || 'Yasal & Politikalar'}</h4>
            <ul className="space-y-2 text-sm sm:text-base text-primary-foreground/80">
              <li>
                <Link to={getLocalizedUrl("/aydinlatma-metni")} className="hover:text-primary-foreground transition-colors">
                  {t('aydinlatmaMetni.title')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedUrl("/cerez-aydinlatma-politikasi")} className="hover:text-primary-foreground transition-colors">
                  {t('cerezAydinlatmaPolitikasi.title')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedUrl("/kvk-politikasi")} className="hover:text-primary-foreground transition-colors">
                  {t('kvkPolitikasi.title')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedUrl("/yonetim-bilgi-sistemleri-politikasi")} className="hover:text-primary-foreground transition-colors">
                  {t('yonetimBilgiSistemleriPolitikasi.title')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedUrl("/cerez-ayarlari")} className="hover:text-primary-foreground transition-colors">
                  {t('cerezAyarlari.title')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">{t('footer.contact')}</h4>
            <div className="space-y-3 text-sm sm:text-base text-primary-foreground/80">
              {phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>{phone}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${email}`} className="hover:underline">{email}</a>
                </div>
              )}
              {address && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 mt-1" />
                  <span dangerouslySetInnerHTML={{ __html: address }} />
                </div>
              )}
              {!phone && !email && !address && (
                <>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>{site.telephoneDisplay}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{site.email}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 mt-1" />
                    <span>{`${site.address.streetAddress}, ${site.address.addressLocality}/${site.address.addressRegion}`}</span>
                  </div>
                </>
              )}
              {/* WhatsApp Button */}
              <div className="pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-[#25D366] hover:bg-[#20BA5A] text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-primary-foreground/60">
          <p dangerouslySetInnerHTML={{ __html: t('footer.copyright') }} />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
import { MessageCircle } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { site } from "@/seo/schema";

const FloatingContactButtons = () => {
  const { t } = useTranslation();
  
  // WhatsApp message with pre-filled text
  const whatsappMessage = t('floatingButtons.whatsappMessage') || "Hi Berg Rent A Car Alanya! I need more info about Berg Rent A Car Alanya https://www.bergrentacar.com/";
  const whatsappUrl = `https://wa.me/${site.telephone.replace('+', '')}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <>
      {/* WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-whatsapp-button="true"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[110] flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        aria-label={t('floatingButtons.whatsapp') || 'WhatsApp'}
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </>
  );
};

export default FloatingContactButtons;


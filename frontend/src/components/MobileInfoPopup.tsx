import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MobileInfoPopup = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const messages = [
    t('mobileInfoPopup.noAdvancePayment') || 'Ön Ödeme Yoktur',
    t('mobileInfoPopup.noDeposit') || 'Deposito Yoktur',
    t('mobileInfoPopup.notBroker') || 'Broker Değiliz'
  ];

  useEffect(() => {
    // Check if popup was closed by user
    const popupClosed = localStorage.getItem('mobileInfoPopupClosed');
    if (popupClosed) {
      setIsOpen(false);
      return;
    }

    // Show popup on mobile devices only
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Rotate messages every 3 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, messages.length]);

  // Auto close after 10 seconds
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      handleClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('mobileInfoPopupClosed', 'true');
  };

  if (!isOpen || window.innerWidth >= 768) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex items-center justify-center p-4 bg-black/50">
      <div className="bg-orange-500 text-white rounded-lg shadow-lg p-4 flex items-center justify-between gap-3 max-w-sm w-full animate-in zoom-in-95">
        <div className="flex-1 text-center font-bold text-sm">
          {messages[currentIndex]}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-6 w-6 text-white hover:bg-orange-600 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MobileInfoPopup;


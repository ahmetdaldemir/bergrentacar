import { useTranslation } from "@/contexts/TranslationContext";

const SideBanner = () => {
  const { t } = useTranslation();

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 hidden md:block">
      <div className="bg-orange-500 text-white px-3 py-20 shadow-lg rounded-r-lg cursor-pointer hover:bg-orange-600 transition-colors">
        <div 
          className="whitespace-nowrap font-bold text-sm"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed'
          }}
        >
          {t('sideBanner.noAdvancePayment') || 'Ön Ödeme Yoktur'}
        </div>
      </div>
    </div>
  );
};

export default SideBanner;


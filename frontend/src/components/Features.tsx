import { Shield, Clock, MapPin, CreditCard, Headphones, Star } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Shield,
      titleKey: "features.safeRental.title",
      descriptionKey: "features.safeRental.description"
    },
    {
      icon: Clock,
      titleKey: "features.service24.title",
      descriptionKey: "features.service24.description"
    },
    {
      icon: MapPin,
      titleKey: "features.wideNetwork.title",
      descriptionKey: "features.wideNetwork.description"
    },
    {
      icon: CreditCard,
      titleKey: "features.flexiblePayment.title",
      descriptionKey: "features.flexiblePayment.description"
    },
    {
      icon: Headphones,
      titleKey: "features.customerSupport.title",
      descriptionKey: "features.customerSupport.description"
    },
    {
      icon: Star,
      titleKey: "features.qualityCars.title",
      descriptionKey: "features.qualityCars.description"
    }
  ];

  return (
    <section className="py-8 sm:py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-3 sm:mb-4">
                <feature.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t(feature.titleKey)}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">{t(feature.descriptionKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Luggage, Fuel, Cog } from "lucide-react";

const categories = [
  {
    id: 1,
    name: "Ekonomi",
    description: "Şehir içi kullanım için ideal",
    image: "/rentacar.jpeg",
    pricePerDay: 150,
    features: {
      passengers: 5,
      luggage: 2,
      transmission: "Manuel",
      fuel: "Benzin"
    }
  },
  {
    id: 2,
    name: "Kompakt",
    description: "Konforlu şehir aracı",
    image: "/rentacar.jpeg",
    pricePerDay: 200,
    features: {
      passengers: 5,
      luggage: 3,
      transmission: "Otomatik",
      fuel: "Benzin"
    }
  },
  {
    id: 3,
    name: "SUV",
    description: "Geniş aile aracı",
    image: "/rentacar.jpeg",
    pricePerDay: 350,
    features: {
      passengers: 7,
      luggage: 5,
      transmission: "Otomatik",
      fuel: "Dizel"
    }
  },
  {
    id: 4,
    name: "Lüks",
    description: "Premium deneyim",
    image: "/rentacar.jpeg",
    pricePerDay: 500,
    features: {
      passengers: 5,
      luggage: 4,
      transmission: "Otomatik",
      fuel: "Benzin"
    }
  }
];

const CarCategories = () => {
  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Kampanyalı Araçlar</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Kampanyalı araçlarımızı görüntüleyin ve ihtiyacınıza uygun olanı seçin.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="relative">
                <img 
                  src={category.image} 
                  alt={category.name}
                  className="w-full h-32 sm:h-40 md:h-48 object-cover"
                />
                <Badge className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-primary text-xs">
                  ₺{category.pricePerDay}/gün
                </Badge>
              </div>
              <CardContent className="p-2 sm:p-3 md:p-4">
                <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1 sm:mb-2 line-clamp-1">{category.name}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4 line-clamp-2">{category.description}</p>
                
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{category.features.passengers} Kişi</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                    <Luggage className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{category.features.luggage} Büyük Valiz</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                    <Cog className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{category.features.transmission}</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                    <Fuel className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{category.features.fuel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CarCategories;
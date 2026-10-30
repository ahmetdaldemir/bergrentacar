import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, MapPin, Car, FileText, Mail, Phone, Download, Home, Info } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { trackReservationConversion } from "@/lib/googleAds";

interface ReservationSuccessData {
  reservationId?: string;
  vehicleName?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDate?: string;
  dropoffDate?: string;
  pickupTime?: string;
  dropoffTime?: string;
  totalPrice?: number;
  currencyCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  confirmed?: boolean;
}

const ReservationSuccess = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const reservationData = (location.state as ReservationSuccessData) || {};
  
  // Helper function to safely get translation string
  const safeT = (key: string, fallback: string): string => {
    return String(t(key) || fallback);
  };

  useEffect(() => {
    const data = (location.state as ReservationSuccessData) || {};
    if (!data.reservationId && !data.vehicleName) {
      navigate("/");
      return;
    }

    trackReservationConversion({
      confirmed: data.confirmed === true,
      reservationId: data.reservationId,
      totalPrice: data.totalPrice,
      currencyCode: data.currencyCode,
    });
  }, [location.state, navigate]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: tr });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return "-";
    const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "₺";
    return `${price.toLocaleString("tr-TR")} ${currencySymbol}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <SEO
        title={String(t("reservationSuccess.title") || "Rezervasyon Başarılı | Berg Rent a Car")}
        description={String(t("reservationSuccess.description") || "Rezervasyonunuz başarıyla tamamlandı. Detaylarınızı görüntüleyebilirsiniz.")}
        keywords="rezervasyon, başarılı, araç kiralama, berg rent a car"
        noindex={true}
      />
      <Header />

      <div className="container mx-auto px-4 py-8 sm:py-16">
        {/* Success Icon and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {String(t("reservationSuccess.title") || "Rezervasyonunuz Başarıyla Tamamlandı!")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {String(t("reservationSuccess.subtitle") || "Rezervasyon detaylarınız aşağıda yer almaktadır. E-posta adresinize onay mesajı gönderilmiştir.")}
          </p>
        </div>

        {/* Reservation Details Card */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Reservation Summary */}
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {safeT("reservationSuccess.reservationDetails", "Rezervasyon Detayları")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reservationData.reservationId && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium text-muted-foreground">
                    {safeT("reservationSuccess.reservationNumber", "Rezervasyon No:")}
                  </span>
                  <span className="text-lg font-bold">{String(reservationData.reservationId || '')}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Info */}
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Car className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {safeT("reservationSuccess.vehicle", "Araç")}
                    </p>
                    <p className="font-semibold">{String(reservationData.vehicleName || "-")}</p>
                  </div>
                </div>

                {/* Total Price */}
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <FileText className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {safeT("reservationSuccess.totalPrice", "Toplam Tutar")}
                    </p>
                    <p className="font-semibold text-lg text-primary">
                      {formatPrice(reservationData.totalPrice, reservationData.currencyCode)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup & Dropoff Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  {safeT("reservationSuccess.pickupDetails", "Alış Bilgileri")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {safeT("reservationSuccess.location", "Konum")}
                  </p>
                  <p className="font-semibold">{String(reservationData.pickupLocation || "-")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {safeT("reservationSuccess.date", "Tarih")}
                    </p>
                    <p className="font-semibold">{formatDate(reservationData.pickupDate)}</p>
                  </div>
                </div>
                {reservationData.pickupTime && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {safeT("reservationSuccess.time", "Saat")}
                    </p>
                    <p className="font-semibold">{String(reservationData.pickupTime || '')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dropoff Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  {safeT("reservationSuccess.dropoffDetails", "İade Bilgileri")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {safeT("reservationSuccess.location", "Konum")}
                  </p>
                    <p className="font-semibold">{String(reservationData.dropoffLocation || "-")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {safeT("reservationSuccess.date", "Tarih")}
                    </p>
                    <p className="font-semibold">{formatDate(reservationData.dropoffDate)}</p>
                  </div>
                </div>
                {reservationData.dropoffTime && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {safeT("reservationSuccess.time", "Saat")}
                    </p>
                    <p className="font-semibold">{String(reservationData.dropoffTime || '')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Customer Info */}
          {reservationData.customerName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  {safeT("reservationSuccess.customerInfo", "İletişim Bilgileri")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {safeT("reservationSuccess.customerName", "Ad Soyad")}
                  </p>
                  <p className="font-semibold">{String(reservationData.customerName || '')}</p>
                </div>
                {reservationData.customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{String(reservationData.customerEmail || '')}</p>
                  </div>
                )}
                {reservationData.customerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{String(reservationData.customerPhone || '')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Important Information */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {safeT("reservationSuccess.importantInfo", "Önemli Bilgiler")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• {safeT("reservationSuccess.info1", "Rezervasyon onayınız e-posta adresinize gönderilmiştir.")}</p>
              <p>• {safeT("reservationSuccess.info2", "Rezervasyonunuzu iptal etmek veya değiştirmek için lütfen bizimle iletişime geçin.")}</p>
              <p>• {safeT("reservationSuccess.info3", "Alış günü yanınızda geçerli ehliyet ve kimlik belgenizi bulundurmayı unutmayın.")}</p>
              <p>• {safeT("reservationSuccess.info4", "Sorularınız için 7/24 müşteri hizmetlerimizden destek alabilirsiniz.")}</p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate("/")}
              variant="default"
              size="lg"
              className="flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              {safeT("reservationSuccess.backToHome", "Ana Sayfaya Dön")}
            </Button>
            <Button
              onClick={() => navigate("/reservations")}
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              {safeT("reservationSuccess.viewReservations", "Rezervasyonlarımı Görüntüle")}
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              {safeT("reservationSuccess.download", "Yazdır / İndir")}
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ReservationSuccess;


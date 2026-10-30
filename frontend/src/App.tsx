import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { DestinationsProvider } from "@/contexts/DestinationsContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { useAuthInit } from "@/hooks/useAuthInit";
import { useEffect } from "react";
import { DEFAULT_LOCALE, getRouterBasename, isLocale } from "@/i18n/locales";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import DestinationDetail from "./pages/DestinationDetail";
import Reservations from "./pages/Reservations";
import HelpCenter from "./pages/HelpCenter";
import ContactUs from "./pages/ContactUs";
import FAQ from "./pages/FAQ";
import LiveChat from "./pages/LiveChat";
import VehicleSearch from "./pages/VehicleSearch";
import CompanyInfo from "./pages/CompanyInfo";
import NotFound from "./pages/NotFound";
import AydinlatmaMetni from "./pages/AydinlatmaMetni";
import CerezAydinlatmaPolitikasi from "./pages/CerezAydinlatmaPolitikasi";
import KVKPolitikasi from "./pages/KVKPolitikasi";
import YonetimBilgiSistemleriPolitikasi from "./pages/YonetimBilgiSistemleriPolitikasi";
import CerezAyarlari from "./pages/CerezAyarlari";
import ReservationSuccess from "./pages/ReservationSuccess";
import AllDestinations from "./pages/AllDestinations";
import BlogDetail from "./pages/BlogDetail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import BottomNavigation from "./components/BottomNavigation";
import SideBanner from "./components/SideBanner";
import FloatingContactButtons from "./components/FloatingContactButtons";
import GoogleAdsPageTracker from "./components/GoogleAdsPageTracker";
import CookieConsentBanner from "./components/CookieConsentBanner";

const queryClient = new QueryClient();
const routerBasename = getRouterBasename();

const LocaleRedirect = () => {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const first = pathname.split("/").filter(Boolean)[0];
    if (isLocale(first)) return;
    const rest = pathname === "/" ? "/" : pathname;
    window.location.replace(`/${DEFAULT_LOCALE}${rest === "/" ? "/" : rest}${search}${hash}`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Yönlendiriliyor...</p>
    </div>
  );
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/destination/:slug" element={<DestinationDetail />} />
    <Route path="/reservations" element={<Reservations />} />
    <Route path="/help-center" element={<HelpCenter />} />
    <Route path="/contact-us" element={<ContactUs />} />
    <Route path="/faq" element={<FAQ />} />
    <Route path="/live-chat" element={<LiveChat />} />
    <Route path="/company-info" element={<CompanyInfo />} />
    <Route path="/vehicles/search" element={<VehicleSearch />} />
    <Route path="/aydinlatma-metni" element={<AydinlatmaMetni />} />
    <Route path="/cerez-aydinlatma-politikasi" element={<CerezAydinlatmaPolitikasi />} />
    <Route path="/kvk-politikasi" element={<KVKPolitikasi />} />
    <Route path="/yonetim-bilgi-sistemleri-politikasi" element={<YonetimBilgiSistemleriPolitikasi />} />
    <Route path="/cerez-ayarlari" element={<CerezAyarlari />} />
    <Route path="/reservation-success" element={<ReservationSuccess />} />
    <Route path="/destinations" element={<AllDestinations />} />
    <Route path="/blog/:slug" element={<BlogDetail />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const AppContent = () => {
  const { isLoading } = useAuthInit();

  if (!routerBasename) {
    return <LocaleRedirect />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter basename={routerBasename}>
      <AppRoutes />
      <GoogleAdsPageTracker />
      <CookieConsentBanner />
      <BottomNavigation />
      <FloatingContactButtons />
      <SideBanner />
    </BrowserRouter>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <DestinationsProvider>
          <CustomerAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
          </CustomerAuthProvider>
        </DestinationsProvider>
      </TranslationProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

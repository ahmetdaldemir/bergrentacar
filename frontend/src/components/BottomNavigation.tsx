import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, User } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useCustomerAuth();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    {
      id: "home",
      path: "/",
      icon: Home,
      label: t("bottomNav.home") || "Ana Sayfa",
    },
    {
      id: "reservations",
      path: "/reservations",
      icon: Calendar,
      label: t("bottomNav.reservations") || "Rezervasyonlar",
    },
    {
      id: isAuthenticated ? "profile" : "login",
      path: isAuthenticated ? "/profile" : "/login",
      icon: User,
      label: isAuthenticated 
        ? (t("bottomNav.profile") || "Profil")
        : (t("bottomNav.login") || "Üyelik"),
    },
  ];

  return (
    <>
      {/* Bottom Navigation - Only visible on mobile */}
      <nav className="fixed w-full bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                  active
                    ? "text-primary -translate-y-2"
                    : "text-gray-600"
                }`}
              >
                <div className={`relative ${active ? "scale-110" : ""} transition-transform`}>
                  <Icon
                    className={`h-5 w-5 mb-1 ${
                      active ? "text-primary" : "text-gray-600"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    active ? "text-primary" : "text-gray-600"
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer for mobile to prevent content from being hidden behind bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
};

export default BottomNavigation;


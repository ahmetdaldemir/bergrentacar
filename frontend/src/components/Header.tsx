import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Phone, ChevronDown, Menu, User, LogOut } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format, addDays } from "date-fns";
import { api } from "@/services/api";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useDestinations } from "@/contexts/DestinationsContext";
import { Language, Currency, Destination, Category } from "@/types";
import { useTranslation } from "@/contexts/TranslationContext";
import { getApiAssetUrl } from "@/config/api";
import { getLocaleFromPath, pickLanguageForUrl, supportedLanguages } from "@/i18n/locales";

const Header = () => {
  const { t, setCurrentLanguage, currentLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, customer, logout } = useCustomerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const { getCachedDestinations } = useDestinations();
  const featuredDestinations = (() => {
    const list = currentLanguage?.id ? getCachedDestinations(currentLanguage.id) : null;
    return list ? list.filter((d: Destination) => d.isFeatured === true) : [];
  })();

  // Load languages from localStorage or fetch once
  useEffect(() => {
    const savedLanguageId = localStorage.getItem('selectedLanguageId');
    let savedLanguage: Language | null = null;
    if (savedLanguageId) {
      try {
        const savedLangStr = localStorage.getItem('selectedLanguage');
        savedLanguage = savedLangStr ? JSON.parse(savedLangStr) : null;
      } catch {
        localStorage.removeItem('selectedLanguage');
      }
    }

    // Check if languages are already in localStorage
    const savedLanguages = localStorage.getItem('languages');
    if (savedLanguages) {
      try {
        const languagesList: Language[] = JSON.parse(savedLanguages);
        const activeLanguages = languagesList.filter(lang => lang.isActive === true);
        const urlLanguages = supportedLanguages(activeLanguages);
        setLanguages(urlLanguages);

        const urlLang = pickLanguageForUrl(urlLanguages);
        if (urlLang) {
          setSelectedLanguage(urlLang);
          setCurrentLanguage(urlLang);
        }
        return; // Exit early if we have cached data
      } catch (e) {
        // If parsing fails, continue to fetch
        if (process.env.NODE_ENV === 'development') {
          console.error('Error parsing saved languages:', e);
        }
      }
    }

    // Fetch languages only if not in localStorage
    const fetchLanguages = async () => {
      try {
        const data = await api.getLanguages();
        let languagesList: Language[] = [];
        
        if (Array.isArray(data)) {
          languagesList = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          languagesList = data.data;
        } else if (data && typeof data === 'object' && Array.isArray(data.languages)) {
          languagesList = data.languages;
        }

        // Filter only active languages
        const activeLanguages = languagesList.filter(lang => lang.isActive === true);
        
        // Save to localStorage
        localStorage.setItem('languages', JSON.stringify(languagesList));
        
        const urlLanguages = supportedLanguages(activeLanguages);
        setLanguages(urlLanguages);

        const urlLang = pickLanguageForUrl(urlLanguages);
        if (urlLang) {
          setSelectedLanguage(urlLang);
          setCurrentLanguage(urlLang);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching languages:', error);
        }
      }
    };

    fetchLanguages();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for login success to update language from defaultLanguage
  useEffect(() => {
    const handleStorageChange = () => {
      const defaultLanguage = localStorage.getItem('defaultLanguage');
      if (defaultLanguage) {
        try {
          const lang = JSON.parse(defaultLanguage);
          if (lang.code?.toLowerCase() === getLocaleFromPath()) {
            setSelectedLanguage(lang);
            setCurrentLanguage(lang);
            localStorage.setItem('selectedLanguageId', lang.id);
            localStorage.setItem('selectedLanguage', defaultLanguage);
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error parsing defaultLanguage:', e);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also check on mount
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const data = await api.getStaticData();
        if (data && data.settings?.site) {
          // Set logo from settings.site.logoUrl
          if (data.settings.site.logoUrl) {
            const logoUrl = getApiAssetUrl(data.settings.site.logoUrl);
            setLogo(logoUrl);
          }

          if (data.settings.site.faviconUrl) {
            const faviconUrl = getApiAssetUrl(data.settings.site.faviconUrl);
            setFavicon(faviconUrl);
          } else {
            setFavicon('/favicon.ico');
          }
          
          // Set phone from settings.site.companyPhone
          if (data.settings.site.companyPhone) {
            setPhone(data.settings.site.companyPhone);
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    fetchStaticData();
  }, []);

  // Load currencies from localStorage or fetch once
  useEffect(() => {
    // Get defaultCurrencyId from tenant settings
    let defaultCurrencyId: string | null = null;
    try {
      const tenantSettings = localStorage.getItem('tenantSettings');
      if (tenantSettings) {
        const settings = JSON.parse(tenantSettings);
        if (settings?.tenant?.defaultCurrencyId) {
          defaultCurrencyId = settings.tenant.defaultCurrencyId;
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing tenantSettings:', e);
      }
    }

    const savedCurrencyId = localStorage.getItem('selectedCurrencyId');
    const savedCurrency = savedCurrencyId 
      ? JSON.parse(localStorage.getItem('selectedCurrency') || 'null')
      : null;

    // Check if currencies are already in localStorage
    const savedCurrencies = localStorage.getItem('currencies');
    if (savedCurrencies) {
      try {
        const currenciesList: Currency[] = JSON.parse(savedCurrencies);
        const activeCurrencies = currenciesList.filter(currency => currency.isActive === true);
        setCurrencies(activeCurrencies);

        // Set selected currency - priority: savedCurrency > defaultCurrencyId > baseCurrency
        if (savedCurrency && activeCurrencies.find(c => c.id === savedCurrency.id)) {
          setSelectedCurrency(savedCurrency);
        } else if (defaultCurrencyId) {
          // Try to find defaultCurrencyId from tenant settings
          const defaultCurrency = activeCurrencies.find(c => c.id === defaultCurrencyId);
          if (defaultCurrency) {
            setSelectedCurrency(defaultCurrency);
            localStorage.setItem('selectedCurrencyId', defaultCurrency.id);
            localStorage.setItem('selectedCurrency', JSON.stringify(defaultCurrency));
          } else {
            // If defaultCurrencyId not found, use base currency or first active currency
            const baseCurrency = activeCurrencies.find(currency => currency.isBaseCurrency === true) || activeCurrencies[0];
            if (baseCurrency) {
              setSelectedCurrency(baseCurrency);
              localStorage.setItem('selectedCurrencyId', baseCurrency.id);
              localStorage.setItem('selectedCurrency', JSON.stringify(baseCurrency));
            }
          }
        } else {
          // Find base currency or use first active currency
          const baseCurrency = activeCurrencies.find(currency => currency.isBaseCurrency === true) || activeCurrencies[0];
          if (baseCurrency) {
            setSelectedCurrency(baseCurrency);
            localStorage.setItem('selectedCurrencyId', baseCurrency.id);
            localStorage.setItem('selectedCurrency', JSON.stringify(baseCurrency));
          }
        }
        return; // Exit early if we have cached data
      } catch (e) {
        // If parsing fails, continue to fetch
        if (process.env.NODE_ENV === 'development') {
          console.error('Error parsing saved currencies:', e);
        }
      }
    }

    // Fetch currencies only if not in localStorage
    const fetchCurrencies = async () => {
      try {
        const data = await api.getCurrencies();
        let currenciesList: Currency[] = [];
        
        if (Array.isArray(data)) {
          currenciesList = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          currenciesList = data.data;
        } else if (data && typeof data === 'object' && Array.isArray(data.currencies)) {
          currenciesList = data.currencies;
        }

        // Filter only active currencies
        const activeCurrencies = currenciesList.filter(currency => currency.isActive === true);
        
        // Save to localStorage
        localStorage.setItem('currencies', JSON.stringify(currenciesList));
        
        setCurrencies(activeCurrencies);

        // Set selected currency - priority: savedCurrency > defaultCurrencyId > baseCurrency
        if (savedCurrency && activeCurrencies.find(c => c.id === savedCurrency.id)) {
          setSelectedCurrency(savedCurrency);
        } else if (defaultCurrencyId) {
          // Try to find defaultCurrencyId from tenant settings
          const defaultCurrency = activeCurrencies.find(c => c.id === defaultCurrencyId);
          if (defaultCurrency) {
            setSelectedCurrency(defaultCurrency);
            localStorage.setItem('selectedCurrencyId', defaultCurrency.id);
            localStorage.setItem('selectedCurrency', JSON.stringify(defaultCurrency));
          } else {
            // If defaultCurrencyId not found, use base currency or first active currency
            const baseCurrency = activeCurrencies.find(currency => currency.isBaseCurrency === true) || activeCurrencies[0];
            if (baseCurrency) {
              setSelectedCurrency(baseCurrency);
              localStorage.setItem('selectedCurrencyId', baseCurrency.id);
              localStorage.setItem('selectedCurrency', JSON.stringify(baseCurrency));
            }
          }
        } else {
          // Find base currency or use first active currency
          const baseCurrency = activeCurrencies.find(currency => currency.isBaseCurrency === true) || activeCurrencies[0];
          if (baseCurrency) {
            setSelectedCurrency(baseCurrency);
            localStorage.setItem('selectedCurrencyId', baseCurrency.id);
            localStorage.setItem('selectedCurrency', JSON.stringify(baseCurrency));
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching currencies:', error);
        }
      }
    };

    fetchCurrencies();
  }, []);

  // Fetch categories when language changes
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentLanguage?.id) return;

      try {
        const response = await api.getCategories(currentLanguage.id);
        let list: Category[] = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (response && typeof response === 'object' && Array.isArray(response.data)) {
          list = response.data;
        }
        setCategories(list);
      } catch (error) {
        // Error already handled in API, just set empty array
        setCategories([]);
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error fetching categories:', error);
        }
      }
    };

    fetchCategories();
  }, [currentLanguage?.id]);

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    setCurrentLanguage(language);
    const nextLocale = language.code?.toLowerCase();
    const currentLocale = getLocaleFromPath();
    if (nextLocale && nextLocale !== currentLocale) {
      const dest = `/${nextLocale}${location.pathname === '/' ? '/' : location.pathname}${location.search}${location.hash}`;
      window.location.assign(dest);
    }
  };

  // Get destination slug from translations
  const getDestinationSlug = useCallback((destination: Destination): string => {
    if (destination.translations && destination.translations.length > 0) {
      const translation = destination.translations.find(
        (t) => t.languageId === currentLanguage?.id || t.language?.id === currentLanguage?.id
      );
      if (translation?.slug) return translation.slug;
      // Fallback to first translation if current language not found
      if (destination.translations[0]?.slug) return destination.translations[0].slug;
    }
    console.log('destination.translations[0]?.slug',destination.translations[0]?.slug);
    // Fallback to id if no slug found
    return destination.id;
  }, [currentLanguage?.id]);

  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    localStorage.setItem('selectedCurrencyId', currency.id);
    localStorage.setItem('selectedCurrency', JSON.stringify(currency));
    
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: currency }));
  };

  return (
    <header className="bg-primary text-primary-foreground">
      <Helmet>
        {favicon && (
          <link rel="icon" type="image/x-icon" href={favicon} />
        )}
      </Helmet>
      {/* Top bar */}
      <div className="py-2 text-xs sm:text-sm hidden sm:block" style={{ background: '#4071c4' }}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1">
              <span className="text-primary-foreground/80">{t('header.askExperts')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Phone className="h-4 w-4" />
              <span className="font-semibold">{phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Link to="/" className="flex items-center cursor-pointer">
              <img 
                src={"/berglogo22.png"} 
                alt="Berg Rent A Car Alanya" 
                className="h-10 sm:h-8 lg:h-20 w-auto"
              />
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            {/* Language Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 p-2">
                  <span>{selectedLanguage?.code?.toUpperCase() || 'EN'}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg z-50">
                {languages.length > 0 ? (
                  languages.map((language) => (
                    <DropdownMenuItem
                      key={language.id}
                      className={`text-gray-800 hover:bg-gray-100 ${
                        selectedLanguage?.id === language.id ? 'bg-gray-100 font-semibold' : ''
                      }`}
                      onClick={() => handleLanguageChange(language)}
                    >
                      {String(language.name || '')}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem className="text-gray-500" disabled>
                    {t('searchForm.loading')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Currency Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 p-2">
                  <span>{selectedCurrency?.symbol || '$'}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg z-50">
                {currencies.length > 0 ? (
                  currencies.map((currency) => (
                    <DropdownMenuItem
                      key={currency.id}
                      className={`text-gray-800 hover:bg-gray-100 ${
                        selectedCurrency?.id === currency.id ? 'bg-gray-100 font-semibold' : ''
                      }`}
                      onClick={() => handleCurrencyChange(currency)}
                    >
                      {currency.code} ({currency.symbol}) - {currency.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem className="text-gray-500" disabled>
                    {t('searchForm.loading')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Car Categories Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 p-2">
                  <span>{t('header.carCategories')}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg z-50">
                {categories.length > 0 ? (
                  categories
                    .filter((category) => category.translations && category.translations.length > 0)
                    .map((category) => {
                      // Find translation for current language
                      const translation = category.translations?.find(
                        (t) => t.languageId === currentLanguage?.id
                      ) || category.translations?.[0];

                      // Skip if no translation found
                      if (!translation || !translation.name) {
                        return null;
                      }

                      const handleCategoryClick = () => {
                        try {
                          // Try to get search data from localStorage (from SearchForm)
                          const savedSearchData = localStorage.getItem('searchLocationData');
                          const selectedCurrencyId = localStorage.getItem('selectedCurrencyId');
                          
                          if (savedSearchData) {
                            const searchData = JSON.parse(savedSearchData);
                            
                            // Use saved location data if available
                            if (searchData.pickupLocation?.id && searchData.dropoffLocation?.id) {
                              // Use default dates (tomorrow and 7 days later)
                              const tomorrow = addDays(new Date(), 1);
                              const sevenDaysLater = addDays(new Date(), 7);
                              
                              const pickupDate = format(tomorrow, 'yyyy-MM-dd');
                              const dropoffDate = format(sevenDaysLater, 'yyyy-MM-dd');
                              const pickupTime = '10:00';
                              const dropoffTime = '10:00';
                              
                              // Get main location IDs (parent's ID if child, own ID if parent)
                              const mainPickupLocationId = searchData.pickupLocation.parentId || searchData.pickupLocation.locationId || searchData.pickupLocation.id;
                              const mainDropoffLocationId = searchData.dropoffLocation.parentId || searchData.dropoffLocation.locationId || searchData.dropoffLocation.id;
                              
                              // Build search query with category filter
                              const searchQuery = new URLSearchParams({
                                pickupLocationId: String(mainPickupLocationId),
                                dropoffLocationId: String(mainDropoffLocationId),
                                pickupDate,
                                dropoffDate,
                                pickupTime,
                                dropoffTime,
                              });
                              
                              // Add category filter (use translation.value or category.id as segment)
                              if (translation.value) {
                                searchQuery.append('segment', translation.value);
                              } else {
                                searchQuery.append('segment', category.id);
                              }
                              
                              // Add currencyId if available
                              if (selectedCurrencyId) {
                                searchQuery.append('currencyId', selectedCurrencyId);
                              }
                              
                              // Navigate to vehicle search page
                              navigate(`/vehicles/search?${searchQuery.toString()}`);
                            } else {
                              // No location data, redirect to home page
                              navigate('/');
                            }
                          } else {
                            // No search data in localStorage, redirect to home page
                            navigate('/');
                          }
                        } catch (error) {
                          console.error('Error handling category click:', error);
                          // On error, redirect to home page
                          navigate('/');
                        }
                      };

                      return (
                        <DropdownMenuItem
                          key={category.id}
                          className="text-gray-800 hover:bg-gray-100 cursor-pointer"
                          onClick={handleCategoryClick}
                        >
                          {translation.name}
                        </DropdownMenuItem>
                      );
                    })
                    .filter(Boolean)
                ) : (
                  <DropdownMenuItem className="text-gray-500" disabled>
                    {t('searchForm.loading')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Support Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 p-2">
                  <span>{t('header.support')}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg z-50">

              <DropdownMenuItem className="text-gray-800 hover:bg-gray-100">
                <Link to="/company-info">{t('header.companyInfo')}</Link></DropdownMenuItem>
                
                <DropdownMenuItem className="text-gray-800 hover:bg-gray-100" asChild>
                  <Link to="/help-center">{t('header.helpCenter')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-800 hover:bg-gray-100" asChild>
                  <Link to="/contact-us">{t('header.contactUs')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-800 hover:bg-gray-100" asChild>
                  <Link to="/faq">{t('header.faq')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-800 hover:bg-gray-100" asChild>
                  <Link to="/live-chat">{t('header.liveChat')}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Top Destinations Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 p-2">
                  <span>{t('header.topDestinations')}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg z-50">
                {featuredDestinations.length > 0 ? (
                  featuredDestinations
                    .filter((destination) => destination.translations && destination.translations.length > 0)
                    .map((destination) => {
                      // Find translation for current language
                      const translation = destination.translations?.find(
                        (t) => t.languageId === currentLanguage?.id
                      ) || destination.translations?.[0];

                      // Skip if no translation found
                      if (!translation || !translation.name) {
                        return null;
                      }

                      return (
                        <DropdownMenuItem
                          key={destination.id}
                          className="text-gray-800 hover:bg-gray-100 cursor-pointer"
                          onClick={() => navigate(`/destination/${getDestinationSlug(destination)}`)}
                        >
                          {translation.name}
                        </DropdownMenuItem>
                      );
                    })
                    .filter(Boolean)
                ) : (
                  <DropdownMenuItem className="text-gray-500" disabled>
                    {t('searchForm.loading')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Login/Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 p-2">
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden xl:inline">
                    {isAuthenticated && customer 
                      ? customer.firstName || t('header.profile') || 'Profil'
                      : t('header.login') || 'Giriş Yap'}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg z-50">
                {isAuthenticated && customer ? (
                  <>
                    <div className="px-2 py-1.5 border-b">
                      <p className="text-sm font-semibold text-gray-900">{customer.fullName}</p>
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    </div>
                    <DropdownMenuItem
                      className="text-gray-800 hover:bg-gray-100 cursor-pointer"
                      onClick={() => navigate('/profile')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      {t('header.profile') || 'Profil'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 hover:bg-red-50 cursor-pointer"
                      onClick={async () => {
                        await logout();
                        navigate('/');
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('auth.logout') || 'Çıkış Yap'}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      className="text-gray-800 hover:bg-gray-100 cursor-pointer"
                      onClick={() => navigate('/login')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      {t('auth.login') || 'Giriş Yap'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-gray-800 hover:bg-gray-100 cursor-pointer"
                      onClick={() => navigate('/register')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      {t('auth.register') || 'Kayıt Ol'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

          
          </nav>

          {/* Mobile Menu */}
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 p-2">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-white">
                <SheetHeader>
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Mobile navigation menu with language, currency, categories, and links
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {/* Mobile Phone */}
                  <div className="flex items-center space-x-2 pb-4 border-b">
                    <Phone className="h-4 w-4 text-gray-600" />
                    <span className="font-semibold text-gray-800">{phone}</span>
                  </div>

                  {/* Language Dropdown */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('header.askExperts')}</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span>{String(selectedLanguage?.name || 'Select Language')}</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[280px]">
                        {languages.map((language) => (
                          <DropdownMenuItem
                            key={language.id}
                            onClick={() => {
                              handleLanguageChange(language);
                              setMobileMenuOpen(false);
                            }}
                          >
                            {String(language.name || '')}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Currency Dropdown */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Currency</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span>{selectedCurrency?.code || 'Select Currency'}</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[280px]">
                        {currencies.map((currency) => (
                          <DropdownMenuItem
                            key={currency.id}
                            onClick={() => {
                              handleCurrencyChange(currency);
                              setMobileMenuOpen(false);
                            }}
                          >
                            {currency.code} ({currency.symbol}) - {currency.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Car Categories */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('header.carCategories')}</label>
                    <div className="space-y-2">
                      {categories
                        .filter((category) => category.translations && category.translations.length > 0)
                        .map((category) => {
                          const translation = category.translations?.find(
                            (t) => t.languageId === currentLanguage?.id
                          ) || category.translations?.[0];
                          
                          // Skip if no translation found
                          if (!translation || !translation.name) {
                            return null;
                          }
                          
                          const handleCategoryClick = () => {
                            try {
                              // Try to get search data from localStorage (from SearchForm)
                              const savedSearchData = localStorage.getItem('searchLocationData');
                              const selectedCurrencyId = localStorage.getItem('selectedCurrencyId');
                              
                              if (savedSearchData) {
                                const searchData = JSON.parse(savedSearchData);
                                
                                // Use saved location data if available
                                if (searchData.pickupLocation?.id && searchData.dropoffLocation?.id) {
                                  // Use default dates (tomorrow and 7 days later)
                                  const tomorrow = addDays(new Date(), 1);
                                  const sevenDaysLater = addDays(new Date(), 7);
                                  
                                  const pickupDate = format(tomorrow, 'yyyy-MM-dd');
                                  const dropoffDate = format(sevenDaysLater, 'yyyy-MM-dd');
                                  const pickupTime = '10:00';
                                  const dropoffTime = '10:00';
                                  
                                  // Get main location IDs (parent's ID if child, own ID if parent)
                                  const mainPickupLocationId = searchData.pickupLocation.parentId || searchData.pickupLocation.locationId || searchData.pickupLocation.id;
                                  const mainDropoffLocationId = searchData.dropoffLocation.parentId || searchData.dropoffLocation.locationId || searchData.dropoffLocation.id;
                                  
                                  // Build search query with category filter
                                  const searchQuery = new URLSearchParams({
                                    pickupLocationId: String(mainPickupLocationId),
                                    dropoffLocationId: String(mainDropoffLocationId),
                                    pickupDate,
                                    dropoffDate,
                                    pickupTime,
                                    dropoffTime,
                                  });
                                  
                                  // Add category filter (use translation.value or category.id as segment)
                                  if (translation.value) {
                                    searchQuery.append('segment', translation.value);
                                  } else {
                                    searchQuery.append('segment', category.id);
                                  }
                                  
                                  // Add currencyId if available
                                  if (selectedCurrencyId) {
                                    searchQuery.append('currencyId', selectedCurrencyId);
                                  }
                                  
                                  // Navigate to vehicle search page
                                  navigate(`/vehicles/search?${searchQuery.toString()}`);
                                  setMobileMenuOpen(false);
                                } else {
                                  // No location data, redirect to home page
                                  navigate('/');
                                  setMobileMenuOpen(false);
                                }
                              } else {
                                // No search data in localStorage, redirect to home page
                                navigate('/');
                                setMobileMenuOpen(false);
                              }
                            } catch (error) {
                              console.error('Error handling category click:', error);
                              // On error, redirect to home page
                              navigate('/');
                              setMobileMenuOpen(false);
                            }
                          };
                          
                          return (
                            <Button
                              key={category.id}
                              variant="ghost"
                              className="w-full justify-start text-gray-700"
                              onClick={handleCategoryClick}
                            >
                              {translation.name}
                            </Button>
                          );
                        })
                        .filter(Boolean)}
                    </div>
                  </div>

                  {/* Support */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('header.support')}</label>
                    <div className="space-y-2">
                      <Link to="/help-center" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start text-gray-700">{t('header.helpCenter')}</Button>
                      </Link>
                      <Link to="/contact-us" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start text-gray-700">{t('header.contactUs')}</Button>
                      </Link>
                      <Link to="/faq" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start text-gray-700">{t('header.faq')}</Button>
                      </Link>
                      <Link to="/live-chat" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start text-gray-700">{t('header.liveChat')}</Button>
                      </Link>
                    </div>
                  </div>

                  {/* Top Destinations */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('header.topDestinations')}</label>
                    <div className="space-y-2">
                      {featuredDestinations
                        .filter((destination) => destination.translations && destination.translations.length > 0)
                        .map((destination) => {
                          const translation = destination.translations?.find(
                            (t) => t.languageId === currentLanguage?.id
                          ) || destination.translations?.[0];
                          
                          // Skip if no translation found
                          if (!translation || !translation.name) {
                            return null;
                          }
                          
                          return (
                            <Button
                              key={destination.id}
                              variant="ghost"
                              className="w-full justify-start text-gray-700"
                              onClick={() => {
                                navigate(`/destination/${getDestinationSlug(destination)}`);
                                setMobileMenuOpen(false);
                              }}
                            >
                              {translation.name}
                            </Button>
                          );
                        })
                        .filter(Boolean)}
                    </div>
                  </div>

                  {/* About Us */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">{t('header.aboutUs')}</label>
                    <div className="space-y-2">
                      <Button variant="ghost" className="w-full justify-start text-gray-700" asChild>
                        <Link to="/company-info">{t('header.companyInfo')}</Link>
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-gray-700">{t('header.ourStory')}</Button>
                      <Button variant="ghost" className="w-full justify-start text-gray-700">{t('header.careers')}</Button>
                      <Button variant="ghost" className="w-full justify-start text-gray-700">{t('header.press')}</Button>
                    </div>
                  </div>

                  {/* Login/Profile Section */}
                  <div className="pt-4 border-t">
                    {isAuthenticated && customer ? (
                      <>
                        <div className="px-2 py-2 mb-2 bg-gray-50 rounded">
                          <p className="text-sm font-semibold text-gray-900">{customer.fullName}</p>
                          <p className="text-xs text-gray-500">{customer.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-gray-700"
                          onClick={() => {
                            navigate('/profile');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          {t('header.profile') || 'Profil'}
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            await logout();
                            setMobileMenuOpen(false);
                            navigate('/');
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          {t('auth.logout') || 'Çıkış Yap'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-gray-700"
                          onClick={() => {
                            navigate('/login');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          {t('auth.login') || 'Giriş Yap'}
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-gray-700"
                          onClick={() => {
                            navigate('/register');
                            setMobileMenuOpen(false);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          {t('auth.register') || 'Kayıt Ol'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, Calendar, MapPin, Car, Info, User, CreditCard, FileText, ChevronDown, ChevronUp, Banknote, CheckCircle2, Check } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { Vehicle } from "@/types/vehicle";
import { Extra } from "@/types/extra";
import { PickupLocation, Country } from "@/types";
import { ReservationRequest } from "@/types/reservation";
import { format, differenceInYears, parseISO, subYears, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { getApiAssetUrl } from "@/config/api";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { extractReservationId } from "@/lib/googleAds";

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  extras: Extra[];
  pickupLocation: PickupLocation | null;
  dropoffLocation: PickupLocation | null;
  pickupDate: string | null;
  dropoffDate: string | null;
  pickupTime: string;
  dropoffTime: string;
  rentalDays: number;
  onReserve: (selectedExtras: Extra[]) => void;
}

const DEFAULT_LICENSE_EXPIRY_DATE = '2040-12-31';

const ReservationModal = ({
  open,
  onClose,
  vehicle,
  extras,
  pickupLocation,
  dropoffLocation,
  pickupDate,
  dropoffDate,
  pickupTime,
  dropoffTime,
  rentalDays,
  onReserve,
}: ReservationModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { customer, isAuthenticated } = useCustomerAuth();
  const [step, setStep] = useState<'extras' | 'form'>('extras');
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_at_office' | 'online'>('cash');
  const [creditCardPaymentEnabled, setCreditCardPaymentEnabled] = useState(false);
  const [licenseAgeError, setLicenseAgeError] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);
  const [licenseCountryOpen, setLicenseCountryOpen] = useState(false);
  
  // Remove accordion states - all sections will be open
  // const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  // const [licenseInfoOpen, setLicenseInfoOpen] = useState(false);
  // const [locationDetailsOpen, setLocationDetailsOpen] = useState(false);
  // const [paymentInfoOpen, setPaymentInfoOpen] = useState(false);
  // const [formStep, setFormStep] = useState<'personal' | 'license' | 'location' | 'payment'>('personal');
  
  // Date mask helper functions
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), "dd.MM.yyyy", { locale: tr });
    } catch {
      return dateString;
    }
  };

  const parseDateFromMask = (maskedValue: string): string | null => {
    // Remove all non-digit characters
    const digits = maskedValue.replace(/\D/g, '');
    
    if (digits.length === 0) return null;
    
    // Format: dd.MM.yyyy
    let day = digits.slice(0, 2);
    let month = digits.slice(2, 4);
    let year = digits.slice(4, 8);
    
    // Validate and format
    if (day.length === 2 && month.length === 2 && year.length === 4) {
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      // Basic validation
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
        try {
          const date = new Date(yearNum, monthNum - 1, dayNum);
          if (date.getFullYear() === yearNum && date.getMonth() === monthNum - 1 && date.getDate() === dayNum) {
            return format(date, 'yyyy-MM-dd');
          }
        } catch {
          return null;
        }
      }
    }
    
    return null;
  };

  const applyDateMask = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    if (digits.length === 0) return '';
    
    // Apply mask: dd.MM.yyyy
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
    }
  };

  // State for masked input values (for display)
  const [maskedDateOfBirth, setMaskedDateOfBirth] = useState('');
  const [maskedLicenseIssueDate, setMaskedLicenseIssueDate] = useState('');
  
  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // State to store location data from localStorage
  const [savedLocationData, setSavedLocationData] = useState<{
    pickupLocation?: { type?: string };
    dropoffLocation?: { type?: string };
  } | null>(null);

  // Load location data from localStorage when modal opens
  useEffect(() => {
    if (!open) return;
    
    try {
      const savedData = localStorage.getItem('searchLocationData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setSavedLocationData(parsed);
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 [RESERVATION] Loaded location data from localStorage:', parsed);
        }
      }
    } catch (error) {
      console.error('❌ [RESERVATION] Error loading location data from localStorage:', error);
    }
  }, [open]);
  
  // All sections open - no wizard/accordion
  
  // Form data
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    lastName: '',
    nationality: 'TR',
    identityNumber: '',
    dateOfBirth: '',
    phoneCountryCode: '+90',
    phoneNumber: '',
    email: '',
    
    // License Info
    licenseNumber: '',
    licenseIssueDate: '',
    licenseExpiryDate: DEFAULT_LICENSE_EXPIRY_DATE,
    licenseCountry: 'TR',
    
    // Address Info
    address: '',
    city: '',
    postalCode: '',
    country: 'TR',
    
    // Payment Info
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    
    // Agreements
    personalDataConsent: false,
    commercialElectronicConsent: false,
    rentalConditionsConsent: true,
    
    // Additional
    promoCode: '',
    specialRequests: '',
    
    // Location-specific fields
    pickupFlightNumber: '',
    pickupFlightDescription: '',
    dropoffFlightNumber: '',
    dropoffFlightDescription: '',
    pickupHotelName: '',
    dropoffHotelName: '',
    pickupAddress: '',
    dropoffAddress: '',
  });

  // Auto-select mandatory extras when modal opens or extras change
  useEffect(() => {
    if (open && extras && extras.length > 0) {
      const mandatoryExtras = extras
        .filter(extra => extra.isMandatory)
        .map(extra => extra.id);
      setSelectedExtras(new Set(mandatoryExtras));
    }
  }, [open, extras]);

  // Auto-fill form data from customer profile when modal opens and user is authenticated
  useEffect(() => {
    if (open && isAuthenticated && customer) {
      // Parse phone number - remove country code if present
      const parsePhoneNumber = (phone: string): { phoneNumber: string; phoneCountryCode: string } => {
        if (!phone) return { phoneNumber: '', phoneCountryCode: '+90' };
        
        // Try to extract country code from phone number
        const phoneWithoutSpaces = phone.replace(/\s/g, '');
        
        // Check if phone starts with + or country code
        if (phoneWithoutSpaces.startsWith('+')) {
          // Find matching country code
          const matchingCountry = countries.find(country => 
            phoneWithoutSpaces.startsWith(country.phoneCode)
          );
          
          if (matchingCountry) {
            return {
              phoneNumber: phoneWithoutSpaces.replace(matchingCountry.phoneCode, ''),
              phoneCountryCode: matchingCountry.phoneCode
            };
          }
        }
        
        // Default: use customer country to find phone code
        const customerCountry = countries.find(c => c.code === customer.country);
        const defaultPhoneCode = customerCountry?.phoneCode || '+90';
        
        // Remove all non-digits for phone number
        const digitsOnly = phoneWithoutSpaces.replace(/\D/g, '');
        
        return {
          phoneNumber: digitsOnly,
          phoneCountryCode: defaultPhoneCode
        };
      };

      const { phoneNumber: parsedPhoneNumber, phoneCountryCode: parsedPhoneCode } = parsePhoneNumber(customer.mobilePhone || '');

      setFormData(prev => ({
        ...prev,
        // Personal Info - only fill if empty
        firstName: prev.firstName || customer.firstName || '',
        lastName: prev.lastName || customer.lastName || '',
        email: prev.email || customer.email || '',
        phoneNumber: prev.phoneNumber || parsedPhoneNumber,
        phoneCountryCode: prev.phoneCountryCode || parsedPhoneCode,
        identityNumber: prev.identityNumber || customer.idNumber || '',
        dateOfBirth: prev.dateOfBirth || (customer.birthDate ? format(parseISO(customer.birthDate), 'yyyy-MM-dd') : ''),
        nationality: prev.nationality || customer.country || 'TR',
        // License Info
        licenseNumber: prev.licenseNumber || customer.licenseNumber || '',
        // Address Info
        address: prev.address || customer.homeAddress || '',
        country: prev.country || customer.country || 'TR',
      }));
    }
  }, [open, isAuthenticated, customer, countries]);

  const handleExtraToggle = useCallback((extraId: string, isMandatory: boolean) => {
    if (isMandatory) return; // Can't deselect mandatory extras
    
    setSelectedExtras(prev => {
      const newSet = new Set(prev);
      if (newSet.has(extraId)) {
        newSet.delete(extraId);
      } else {
        newSet.add(extraId);
      }
      return newSet;
    });
  }, []);

  const calculateExtraPrice = useCallback((extra: Extra): number => {
    if (extra.salesType === 'daily') {
      return extra.price * rentalDays;
    }
    return extra.price;
  }, [rentalDays]);

  const totalPrice = useMemo((): number => {
    if (!vehicle) return 0;
    
    const vehiclePrice = vehicle.totalPrice || vehicle.dailyPrice! * rentalDays || 0;
    const extrasPrice = Array.from(selectedExtras).reduce((total, extraId) => {
      const extra = extras.find(e => e.id === extraId);
      if (extra) {
        const extraPrice = extra.salesType === 'daily' ? extra.price * rentalDays : extra.price;
        return total + extraPrice;
      }
      return total;
    }, 0);
    
    return vehiclePrice + extrasPrice;
  }, [vehicle, selectedExtras, extras, rentalDays]);

  const currencySymbol = useMemo((): string => {
    if (!vehicle) return '₺';
    return vehicle.currencyCode === 'TRY' ? '₺' : vehicle.currencyCode || '₺';
  }, [vehicle]);
  
  const imageUrl = useMemo(() => {
    if (!vehicle) return '/placeholder-vehicle.jpg';
    const vehicleImage = vehicle.images && vehicle.images.length > 0
      ? vehicle.images.find(img => img.isPrimary) || vehicle.images[0]
      : null;
    return vehicleImage 
      ? getApiAssetUrl(vehicleImage.url)
      : vehicle.imageUrl ? getApiAssetUrl(vehicle.imageUrl) : vehicle.image || '/placeholder-vehicle.jpg';
  }, [vehicle]);

  // Memoized formatters
  const formatDate = useCallback((dateString: string | null): string => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'd MMM yyyy', { locale: tr });
    } catch {
      return dateString;
    }
  }, []);

  const formatFuelType = useCallback((fuel?: string) => {
    if (!fuel) return '';
    const fuelMap: Record<string, string> = {
      'gasoline': t('vehicleSearch.benzin'),
      'diesel': t('vehicleSearch.dizel'),
      'electric': t('vehicleSearch.elektrik'),
    };
    return fuelMap[fuel.toLowerCase()] || fuel;
  }, [t]);

  const formatTransmission = useCallback((transmission?: string) => {
    if (!transmission) return '';
    const transMap: Record<string, string> = {
      'manual': t('vehicleSearch.manuel'),
      'automatic': t('vehicleSearch.otomatik'),
    };
    return transMap[transmission.toLowerCase()] || transmission;
  }, [t]);
  
  // Helper function to format card number with spaces
  const formatCardNumber = useCallback((value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  }, []);

  const handleContinue = () => {
    // Validate that at least mandatory extras are selected
    const mandatoryExtras = extras.filter(e => e.isMandatory);
    const allMandatorySelected = mandatoryExtras.every(e => selectedExtras.has(e.id));
    
    if (!allMandatorySelected) {
      toast({
        title: t('reservation.error') || 'Hata',
        description: t('reservation.mandatoryExtrasRequired') || 'Lütfen zorunlu ekstra ürünleri seçin.',
        variant: 'destructive',
      });
      return;
    }
    
    // Switch to form step - all sections will be open
    setStep('form');
    // Scroll to top of form
    setTimeout(() => {
      const formElement = document.getElementById('reservation-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };
  
  // Initial form data (for reset)
  const initialFormData = useMemo(() => ({
    firstName: '',
    lastName: '',
    nationality: 'TR',
    identityNumber: '',
    dateOfBirth: '',
    phoneCountryCode: '+90',
    phoneNumber: '',
    email: '',
    licenseNumber: '',
    licenseIssueDate: '',
    licenseExpiryDate: DEFAULT_LICENSE_EXPIRY_DATE,
    licenseCountry: 'TR',
    address: '',
    city: '',
    postalCode: '',
    country: 'TR',
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    personalDataConsent: false,
    commercialElectronicConsent: false,
    rentalConditionsConsent: true,
    promoCode: '',
    specialRequests: '',
    pickupFlightNumber: '',
    pickupFlightDescription: '',
    dropoffFlightNumber: '',
    dropoffFlightDescription: '',
    pickupHotelName: '',
    dropoffHotelName: '',
    pickupAddress: '',
    dropoffAddress: '',
  }), []);
  
  // Reset form data to initial state
  const resetFormData = useCallback(() => {
    setFormData(initialFormData);
  }, [initialFormData]);
  
  // Comprehensive form validation - all fields validated on submit
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Personal Info validation - all fields required, with trim check
    if (!formData.firstName?.trim()) {
      newErrors.firstName = t('reservation.firstNameRequired') || 'Ad alanı zorunludur';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = t('reservation.lastNameRequired') || 'Soyad alanı zorunludur';
    }
    if (!formData.nationality || !formData.nationality.trim()) {
      newErrors.nationality = t('reservation.nationalityRequired') || 'Uyruk alanı zorunludur';
    }
    if (!formData.identityNumber?.trim()) {
      newErrors.identityNumber = t('reservation.identityNumberRequired') || 'Kimlik No alanı zorunludur';
    }
    if (!formData.dateOfBirth?.trim()) {
      newErrors.dateOfBirth = t('reservation.dateOfBirthRequired') || 'Doğum Tarihi alanı zorunludur';
    }
    if (!formData.phoneNumber?.trim()) {
      newErrors.phoneNumber = t('reservation.phoneNumberRequired') || 'Telefon alanı zorunludur';
    }
    if (!formData.email?.trim()) {
      newErrors.email = t('reservation.emailRequired') || 'E-posta alanı zorunludur';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = t('reservation.emailInvalid') || 'Geçerli bir e-posta adresi giriniz';
    }
    
    // License Info validation - issue date and expiry date are required
    if (!formData.licenseIssueDate?.trim()) {
      newErrors.licenseIssueDate = t('reservation.licenseIssueDateRequired') || 'Ehliyet veriliş tarihi zorunludur';
    } else {
      try {
        const issueDate = parseISO(formData.licenseIssueDate);
        const today = startOfDay(new Date());
        const yearsDifference = differenceInYears(today, issueDate);
        
        if (yearsDifference < 2) {
          newErrors.licenseIssueDate = t('reservation.licenseAgeError') || 'Ehliyet en az 2 yıl önce verilmiş olmalıdır';
          setLicenseAgeError(true);
        } else {
          setLicenseAgeError(false);
        }
      } catch {
        newErrors.licenseIssueDate = t('reservation.invalidDate') || 'Geçerli bir tarih giriniz';
      }
    }
    
    // Location-specific validation - required based on pickup/dropoff location type
    // Pickup location details validation
    if (isAirport('pickup')) {
      if (!formData.pickupFlightNumber?.trim()) {
        newErrors.pickupFlightNumber = t('reservation.pickupFlightNumberRequired') || 'Alış Uçuş No alanı zorunludur';
      }
    }
    if (isHotel('pickup')) {
      if (!formData.pickupHotelName?.trim()) {
        newErrors.pickupHotelName = t('reservation.pickupHotelNameRequired') || 'Alış Otel Adı alanı zorunludur';
      }
    }
    if (isAddress('pickup')) {
      if (!formData.pickupAddress?.trim()) {
        newErrors.pickupAddress = t('reservation.pickupAddressRequired') || 'Alış Adres alanı zorunludur';
      }
    }
    
    // Dropoff location details validation
    if (isAirport('dropoff')) {
      if (!formData.dropoffFlightNumber?.trim()) {
        newErrors.dropoffFlightNumber = t('reservation.dropoffFlightNumberRequired') || 'İade Uçuş No alanı zorunludur';
      }
    }
    if (isHotel('dropoff')) {
      if (!formData.dropoffHotelName?.trim()) {
        newErrors.dropoffHotelName = t('reservation.dropoffHotelNameRequired') || 'İade Otel Adı alanı zorunludur';
      }
    }
    if (isAddress('dropoff')) {
      if (!formData.dropoffAddress?.trim()) {
        newErrors.dropoffAddress = t('reservation.dropoffAddressRequired') || 'İade Adres alanı zorunludur';
      }
    }
    
    // Payment validation (if online payment selected)
    if (paymentMethod === 'online') {
      if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length < 16) {
        newErrors.cardNumber = t('reservation.cardNumberRequired') || 'Kart numarası zorunludur';
      }
      if (!formData.cardHolderName) {
        newErrors.cardHolderName = t('reservation.cardHolderNameRequired') || 'Kart sahibi adı zorunludur';
      }
      if (!formData.expiryMonth || !formData.expiryYear) {
        newErrors.expiryMonth = t('reservation.expiryDateRequired') || 'Son kullanma tarihi zorunludur';
      }
      if (!formData.cvv || formData.cvv.length < 3) {
        newErrors.cvv = t('reservation.cvvRequired') || 'CVV zorunludur';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      
      // Create error messages list from newErrors
      const errorMessages = Object.values(newErrors).slice(0, 5); // Show first 5 errors
      const errorDescription = errorMessages.length > 0
        ? `${t('reservation.formValidationError') || 'Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.'}\n\n${errorMessages.join('\n')}`
        : t('reservation.formValidationError') || 'Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.';
      
      toast({
        title: t('reservation.error') || 'Hata',
        description: errorDescription,
        variant: 'destructive',
      });
      return false;
    }
    
    // Clear errors if validation passes
    setFieldErrors({});
    return true;
  };

  // Helper function to get location type from localStorage or props
  const getLocationType = (locationType: 'pickup' | 'dropoff'): string | null => {
    // First try to get from localStorage
    if (savedLocationData) {
      const location = locationType === 'pickup' 
        ? savedLocationData.pickupLocation 
        : savedLocationData.dropoffLocation;
      if (location?.type) {
        return location.type.toLowerCase();
      }
    }
    
    // Fallback to props
    const location = locationType === 'pickup' ? pickupLocation : dropoffLocation;
    if (location?.type) {
      return location.type.toLowerCase();
    }
    
    return null;
  };

  // Helper function to check if location is airport
  const isAirport = (locationType: 'pickup' | 'dropoff'): boolean => {
    const type = getLocationType(locationType);
    if (!type) return false;
    return type === 'airport' || type === 'havalimani';
  };

  // Helper function to check if location is hotel
  const isHotel = (locationType: 'pickup' | 'dropoff'): boolean => {
    const type = getLocationType(locationType);
    if (!type) return false;
    return type === 'hotel' || type === 'otel';
  };

  // Helper function to check if location is address
  const isAddress = (locationType: 'pickup' | 'dropoff'): boolean => {
    const type = getLocationType(locationType);
    if (!type) return false;
    return type === 'address' || type === 'center' || type === 'merkez';
  };
  
  // Helper function to get location name
  const getLocationName = (loc: PickupLocation | null): string => {
    if (!loc) return '';
    return loc.name || loc.title || '';
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all form fields
    if (!validateForm()) {
      return; // Validation failed, errors are already set
    }
    
    // All validations are done in validateForm() - if we reach here, form is valid
    
    setIsSubmitting(true);
    
    try {
      // Prepare reservation data
      const selectedExtrasList = extras.filter(extra => selectedExtras.has(extra.id));
      const vehiclePrice = vehicle!.totalPrice || vehicle!.dailyPrice! * rentalDays || 0;
      const extrasPrice = selectedExtrasList.reduce((total, extra) => {
        return total + calculateExtraPrice(extra);
      }, 0);
      
      const reservationData: ReservationRequest = {
        // Vehicle and rental info
        vehicleId: String(vehicle!.id),
        pickupLocationId: String(pickupLocation!.id),
        dropoffLocationId: String(dropoffLocation!.id),
        pickupDate: pickupDate!,
        dropoffDate: dropoffDate!,
        pickupTime,
        dropoffTime,
        rentalDays,
        
        // Selected extras
        extras: selectedExtrasList.map(extra => ({
          id: extra.id,
          quantity: 1,
        })),
        
        // Pricing
        vehiclePrice,
        extrasPrice,
        totalPrice: vehiclePrice + extrasPrice,
        currencyCode: vehicle!.currencyCode || 'TRY',
        
        // Customer information
        personalInfo: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          nationality: formData.nationality,
          identityNumber: formData.identityNumber.trim(),
          dateOfBirth: formData.dateOfBirth,
          phoneCountryCode: formData.phoneCountryCode,
          phoneNumber: formData.phoneNumber.trim(),
          email: formData.email.trim().toLowerCase(),
        },
        driverLicenseInfo: {
          licenseNumber: formData.licenseNumber.trim() || '',
          licenseIssueDate: formData.licenseIssueDate || '',
          licenseExpiryDate: DEFAULT_LICENSE_EXPIRY_DATE,
          licenseCountry: formData.licenseCountry,
        },
        addressInfo: {
          address: '1',
          city: '1',
          postalCode: '1',
          country: '1',
        },
        paymentInfo: paymentMethod === 'online' ? {
          cardNumber: formData.cardNumber.replace(/\s/g, ''), // Remove spaces
          cardHolderName: formData.cardHolderName.trim(),
          expiryMonth: formData.expiryMonth,
          expiryYear: formData.expiryYear,
          cvv: formData.cvv,
        } : undefined,
        
        // Payment method
        paymentMethod: paymentMethod,
        
        // Agreements
        personalDataConsent: formData.personalDataConsent,
        commercialElectronicConsent: formData.commercialElectronicConsent,
        rentalConditionsConsent: true,
        
        // Additional info
        promoCode: formData.promoCode.trim() || undefined,
        specialRequests: formData.specialRequests.trim() || undefined,
        
        // Location Details (Alış / Dönüş Detayları)
        pickupDetails: (() => {
          const details: any = {};
          if (formData.pickupFlightNumber.trim()) details.flightNumber = formData.pickupFlightNumber.trim();
          if (formData.pickupFlightDescription.trim()) details.flightDescription = formData.pickupFlightDescription.trim();
          if (formData.pickupHotelName.trim()) details.hotelName = formData.pickupHotelName.trim();
          if (formData.pickupAddress.trim()) details.address = formData.pickupAddress.trim();
          return Object.keys(details).length > 0 ? details : undefined;
        })(),
        dropoffDetails: (() => {
          const details: any = {};
          if (formData.dropoffFlightNumber.trim()) details.flightNumber = formData.dropoffFlightNumber.trim();
          if (formData.dropoffFlightDescription.trim()) details.flightDescription = formData.dropoffFlightDescription.trim();
          if (formData.dropoffHotelName.trim()) details.hotelName = formData.dropoffHotelName.trim();
          if (formData.dropoffAddress.trim()) details.address = formData.dropoffAddress.trim();
          return Object.keys(details).length > 0 ? details : undefined;
        })(),
      };
      
      // Call API
      const response = await api.confirmReservation(reservationData);
      
      // Prepare success page data - ensure all values are strings/primitives
      const getVehicleName = (): string => {
        if (!vehicle) return '';
        // Handle if name is a string
        if (typeof vehicle.name === 'string') return vehicle.name;
        // Handle if model is an object with name property
        if (vehicle.model && typeof vehicle.model === 'object' && vehicle.model !== null) {
          const modelName = (vehicle.model as any).name;
          if (typeof modelName === 'string') {
            const brandName = vehicle.brand && typeof vehicle.brand === 'object' && vehicle.brand !== null
              ? (vehicle.brand as any).name
              : '';
            return brandName ? `${brandName} ${modelName}` : modelName;
          }
        }
        // Handle if model is a string
        if (typeof vehicle.model === 'string') return vehicle.model;
        return '';
      };

      const getReservationId = (): string => {
        return extractReservationId(response) || '';
      };

      const successData = {
        reservationId: getReservationId(),
        vehicleName: getVehicleName(),
        pickupLocation: String(getLocationName(pickupLocation) || ''),
        dropoffLocation: String(getLocationName(dropoffLocation) || ''),
        pickupDate: String(pickupDate || ''),
        dropoffDate: String(dropoffDate || ''),
        pickupTime: String(pickupTime || ''),
        dropoffTime: String(dropoffTime || ''),
        totalPrice: Number(vehiclePrice + extrasPrice),
        currencyCode: String(vehicle?.currencyCode || 'TRY'),
        customerName: String(`${formData.firstName} ${formData.lastName}`),
        customerEmail: String(formData.email || ''),
        customerPhone: String(`${formData.phoneCountryCode} ${formData.phoneNumber}`),
        confirmed: true,
      };
      
      // Call onReserve callback
      onReserve(selectedExtrasList);
      
      // Close modal and navigate to success page
      onClose();
      navigate('/reservation-success', { state: successData });
      
    } catch (error: any) {
      console.error('Reservation error:', error);
      
      // Better error handling with specific messages
      let errorMessage = t('reservation.errorMessage') || 'Rezervasyon tamamlanamadı. Lütfen tekrar deneyin.';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: t('reservation.error') || 'Hata',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await api.getCountries();
        let countriesList: Country[] = [];
        
        if (Array.isArray(data)) {
          countriesList = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          countriesList = data.data;
        } else if (data && typeof data === 'object' && Array.isArray(data.countries)) {
          countriesList = data.countries;
        }
        
        // Filter only active countries
        const activeCountries = countriesList.filter((country: Country) => country.isActive === true);
        setCountries(activeCountries);
      } catch (error) {
        console.error('Error fetching countries:', error);
        setCountries([]);
      }
    };
    
    if (open) {
      fetchCountries();
    }
  }, [open]);

  // Fetch settings to check if credit card payment is enabled
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getStaticData();
        if (data && data.settings) {
          // Check for credit_card_payment in settings
          const creditCardPayment = data.settings.credit_card_payment ?? 
                                   data.settings.payment?.credit_card_payment ?? 
                                   data.settings.site?.credit_card_payment ?? 
                                   false;
          setCreditCardPaymentEnabled(creditCardPayment === true || creditCardPayment === 'true');
        }
      } catch (error) {
        // Default to false if settings not found
        setCreditCardPaymentEnabled(false);
      }
    };
    
    if (open) {
      fetchSettings();
    }
  }, [open]);

  // Reset form and state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('extras');
      setPaymentMethod('cash');
      setLicenseAgeError(false);
      resetFormData();
      setSelectedExtras(new Set());
      setFieldErrors({});
    }
  }, [open, resetFormData]);

  if (!vehicle) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={() => {
      // Only allow closing via close button - do nothing here
    }}>
      <DialogContent 
        className="max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden w-[95vw] sm:w-full"
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing with Escape key
          e.preventDefault();
        }}
      >
        {step === 'extras' ? (
          // Step 1: Extras Selection
          <div key="extras-step" className="flex flex-col lg:flex-row h-full relative">
            {/* Header - Mobile Only */}
            <div className="lg:hidden p-3 sm:p-4 border-b bg-background sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg sm:text-xl font-bold">
                  {t('reservation.extras') || 'Ekstra Ürünler'}
                </DialogTitle>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate('/');
                    }}
                    className="text-xs sm:text-sm text-destructive hover:text-destructive px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">{t('reservation.cancelReservation') || 'Rezervasyon İptal Et'}</span>
                    <span className="sm:hidden">İptal</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogDescription className="sr-only">
                {t('reservation.extras') || 'Ekstra Ürünler'}
              </DialogDescription>
            </div>

            {/* Reservation Summary - Mobile First (Top) */}
            <div className="lg:hidden p-3 sm:p-4 border-b bg-muted/30">
              <h2 className="text-base sm:text-lg font-bold mb-3">
                {t('reservation.summary') || 'Rezervasyon Özeti'}
              </h2>
              
              {/* Vehicle Info - Compact */}
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <img
                    src={imageUrl}
                    alt={vehicle.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-vehicle.jpg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">
                      {vehicle.brand?.name} {vehicle.model?.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {pickupLocation?.name || pickupLocation?.title || '-'} → {dropoffLocation?.name || dropoffLocation?.title || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rentalDays} {t('vehicleSearch.day') || 'Gün'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Summary - Compact */}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">
                    {t('reservation.total') || 'Toplam'}
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-primary">
                    {totalPrice.toLocaleString()} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Extras List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 lg:w-2/3 lg:pt-20 pb-32 lg:pb-6">
              <div className="space-y-4">
              {extras.map((extra) => {
                const isSelected = selectedExtras.has(extra.id);
                const extraPrice = calculateExtraPrice(extra);
                const displayPrice = extra.salesType === 'daily' 
                  ? `${extra.price} ${currencySymbol} / ${t('reservation.day') || 'gün'}`
                  : `${extra.price} ${currencySymbol}`;

                return (
                  <Card key={extra.id} className={`${isSelected ? 'border-primary border-2' : ''}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleExtraToggle(extra.id, extra.isMandatory)}
                            disabled={extra.isMandatory}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-lg">
                                {extra.name}
                                {extra.isMandatory && (
                                  <span className="ml-2 text-xs text-orange-500">
                                    ({t('reservation.mandatory') || 'Zorunlu'})
                                  </span>
                                )}
                              </h3>
                              {extra.description && (
                                <Info className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            {extra.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {extra.description}
                              </p>
                            )}
                            <p className="text-sm font-medium text-primary">
                              {displayPrice}
                              {extra.salesType === 'daily' && rentalDays > 1 && (
                                <span className="text-muted-foreground">
                                  {' '}({t('reservation.total') || 'Toplam'}: {extraPrice.toLocaleString()} {currencySymbol})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-lg font-bold text-primary">
                            {extraPrice.toLocaleString()} {currencySymbol}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            </div>
            
            {/* Mobile Bottom Bar - Total Price + Continue Button - Fixed above BottomNavigator */}
            <div className="lg:hidden sticky bottom-[3rem] left-0 right-0 bg-background border-t shadow-lg z-[110]">
              {/* Total Price */}
              <div className="px-3 sm:px-4 py-2 border-b bg-muted/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">
                    {t('reservation.total') || 'Toplam Fiyat'}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {totalPrice.toLocaleString()} {currencySymbol}
                  </span>
                </div>
              </div>
              {/* Continue Button */}
              <div className="p-3 sm:p-4">
                <Button
                  onClick={handleContinue}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 text-base"
                  size="lg"
                >
                  {t('reservation.continue') || 'Devam Et'}
                </Button>
              </div>
            </div>

          {/* Desktop Header */}
          <div className="hidden lg:block absolute top-0 left-0 right-0 p-4 border-b bg-background z-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {t('reservation.extras') || 'Ekstra Ürünler'}
              </DialogTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    navigate('/');
                  }}
                  className="text-sm text-destructive hover:text-destructive"
                >
                  {t('reservation.cancelReservation') || 'Rezervasyon İptal Et'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side - Vehicle Info & Summary (Desktop Only) */}
          <div className="hidden lg:block lg:w-1/3 bg-muted/30 p-6 border-l">
            <div className="sticky top-6">
              <h2 className="text-xl font-bold mb-4">
                {t('reservation.summary') || 'Rezervasyon Özeti'}
              </h2>

              {/* Vehicle Info */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="mb-3">
                    <img
                      src={imageUrl}
                      alt={vehicle.name}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-vehicle.jpg';
                      }}
                    />
                    <h3 className="font-bold text-lg mb-1">
                      {vehicle.brand?.name} {vehicle.model?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {typeof vehicle.category === 'object' 
                        ? vehicle.category?.name 
                        : vehicle.categoryName || vehicle.category || vehicle.segment}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {vehicle.fuelType && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                          {formatFuelType(vehicle.fuelType)}
                        </span>
                      )}
                      {vehicle.transmission && (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                          {formatTransmission(vehicle.transmission)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location & Date Info */}
              <Card className="mb-4">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('reservation.pickup') || 'Alış'}
                      </p>
                      <p className="text-sm font-medium">
                        {pickupLocation?.name || pickupLocation?.title || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pickupDate && formatDate(pickupDate)} {pickupTime}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('reservation.dropoff') || 'Dönüş'}
                      </p>
                      <p className="text-sm font-medium">
                        {dropoffLocation?.name || dropoffLocation?.title || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dropoffDate && formatDate(dropoffDate)} {dropoffTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('reservation.rentalPeriod') || 'Kiralama Süresi'}
                      </p>
                      <p className="text-sm font-medium">
                        {rentalDays} {t('vehicleSearch.day') || 'Gün'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Summary */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('reservation.vehicleRental') || 'Araç Kiralama'}
                      </span>
                      <span className="font-medium">
                        {(vehicle.totalPrice || vehicle.dailyPrice! * rentalDays || 0).toLocaleString()} {currencySymbol}
                      </span>
                    </div>
                    {Array.from(selectedExtras).map(extraId => {
                      const extra = extras.find(e => e.id === extraId);
                      if (!extra) return null;
                      return (
                        <div key={extraId} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{extra.name}</span>
                          <span className="font-medium">
                            {calculateExtraPrice(extra).toLocaleString()} {currencySymbol}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">
                        {t('reservation.total') || 'Toplam'}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {totalPrice.toLocaleString()} {currencySymbol}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Continue Button - Desktop */}
              <Button
                onClick={handleContinue}
                className="hidden lg:block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold  text-base sm:text-lg"
                size="lg"
              >
                {t('reservation.continue') || 'Devam Et'}
              </Button>
            </div>
          </div>

        </div>
        ) : (
          // Step 2: Reservation Form
          <div key="form-step" className="flex flex-col lg:flex-row h-full relative">
            {/* Header - Mobile Only */}
            <div className="lg:hidden p-3 sm:p-4 border-b bg-background sticky top-0 z-10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg sm:text-xl font-bold">
                  {t('reservation.reservationForm') || 'Rezervasyon Formu'}
                </DialogTitle>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('extras')}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    {t('reservation.back') || 'Geri'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate('/');
                    }}
                    className="text-xs sm:text-sm text-destructive hover:text-destructive px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">{t('reservation.cancelReservation') || 'Rezervasyon İptal Et'}</span>
                    <span className="sm:hidden">İptal</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogDescription className="sr-only">
                {t('reservation.reservationForm') || 'Rezervasyon Formu'}
              </DialogDescription>
            </div>

            {/* Reservation Summary - Mobile First (Top) */}
            <div className="lg:hidden p-3 sm:p-4 border-b bg-muted/30 flex-shrink-0">
              <h2 className="text-base sm:text-lg font-bold mb-3">
                {t('reservation.summary') || 'Rezervasyon Özeti'}
              </h2>
              
              {/* Vehicle Info - Compact */}
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <img
                    src={imageUrl}
                    alt={vehicle.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-vehicle.jpg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">
                      {vehicle.brand?.name} {vehicle.model?.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {pickupLocation?.name || pickupLocation?.title || '-'} → {dropoffLocation?.name || dropoffLocation?.title || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pickupDate && formatDate(pickupDate)} {pickupTime} → {dropoffDate && formatDate(dropoffDate)} {dropoffTime}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rentalDays} {t('vehicleSearch.day') || 'Gün'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Summary - Compact */}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">
                    {t('reservation.total') || 'Toplam'}
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-primary">
                    {totalPrice.toLocaleString()} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block absolute top-0 left-0 right-0 p-4 border-b bg-background z-10">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold">
                  {t('reservation.reservationForm') || 'Rezervasyon Formu'}
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('extras')}
                    className="text-sm"
                  >
                    {t('reservation.back') || 'Geri'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate('/');
                    }}
                    className="text-sm text-destructive hover:text-destructive"
                  >
                    {t('reservation.cancelReservation') || 'Rezervasyon İptal Et'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Form Content Wrapper */}
            <div className="flex-1 flex flex-col min-h-0 lg:w-2/3">
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 lg:pt-20 pb-32 lg:pb-6">
                <div className=" lg:mx-auto">

              <form id="reservation-form" onSubmit={handleFormSubmit} className="space-y-4">
                {/* Personal Info Section - Always Open */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-4 pb-4 border-b">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{t('reservation.personalInfo') || 'Kişisel Bilgiler'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t('reservation.personalInfoSubtitle') || 'Kişisel bilgilerinizi düzenleyebilirsiniz'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">
                              {t('reservation.firstName') || 'Ad'} *
                            </Label>
                            <Input
                              id="firstName"
                              value={formData.firstName}
                              onChange={(e) => {
                                setFormData({ ...formData, firstName: e.target.value });
                                if (fieldErrors.firstName) {
                                  setFieldErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.firstName;
                                    return newErrors;
                                  });
                                }
                              }}
                              className={fieldErrors.firstName ? 'border-red-500' : ''}
                              required
                            />
                            {fieldErrors.firstName && (
                              <p className="text-sm text-red-500 mt-1">{fieldErrors.firstName}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="lastName">
                              {t('reservation.lastName') || 'Soyad'} *
                            </Label>
                            <Input
                              id="lastName"
                              value={formData.lastName}
                              onChange={(e) => {
                                setFormData({ ...formData, lastName: e.target.value });
                                if (fieldErrors.lastName) {
                                  setFieldErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.lastName;
                                    return newErrors;
                                  });
                                }
                              }}
                              className={fieldErrors.lastName ? 'border-red-500' : ''}
                              required
                            />
                            {fieldErrors.lastName && (
                              <p className="text-sm text-red-500 mt-1">{fieldErrors.lastName}</p>
                            )}
                          </div>
                        </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="nationality">
                                {t('reservation.nationality') || 'Uyruk'} *
                              </Label>
                              <Popover open={nationalityOpen} onOpenChange={setNationalityOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={nationalityOpen}
                                    className="w-full justify-between"
                                  >
                                    {formData.nationality
                                      ? countries.find((country) => country.code === formData.nationality)?.name || formData.nationality
                                      : t('reservation.selectNationality') || 'Uyruk seçin'}
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder={t('reservation.searchCountry') || 'Ülke ara...'} />
                                    <CommandList>
                                      <CommandEmpty>{t('reservation.noCountryFound') || 'Ülke bulunamadı'}</CommandEmpty>
                                      <CommandGroup>
                                        {countries.map((country) => (
                                          <CommandItem
                                            key={country.id}
                                            value={`${country.name} ${country.code}`}
                                            onSelect={() => {
                                              setFormData({ 
                                                ...formData, 
                                                nationality: country.code,
                                                // Auto-update phone country code when nationality changes
                                                phoneCountryCode: country.phoneCode
                                              });
                                              setNationalityOpen(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                formData.nationality === country.code ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <span className="mr-2">{country.flag || ''}</span>
                                            {country.name} ({country.code})
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <Label htmlFor="identityNumber">
                                {t('reservation.identityNumber') || 'TC Kimlik / Pasaport'} *
                              </Label>
                              <Input
                                id="identityNumber"
                                value={formData.identityNumber}
                                onChange={(e) => {
                                  setFormData({ ...formData, identityNumber: e.target.value });
                                  if (fieldErrors.identityNumber) {
                                    setFieldErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.identityNumber;
                                      return newErrors;
                                    });
                                  }
                                }}
                                className={fieldErrors.identityNumber ? 'border-red-500' : ''}
                                required
                              />
                              {fieldErrors.identityNumber && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.identityNumber}</p>
                              )}
                            </div>
                          </div>
                        
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="dateOfBirth">
                              {t('reservation.dateOfBirth') || 'Doğum Tarihi'} *
                            </Label>
                            <Input
                              id="dateOfBirth"
                              type="text"
                              placeholder="dd.MM.yyyy"
                              value={maskedDateOfBirth || (formData.dateOfBirth ? formatDateForDisplay(formData.dateOfBirth) : '')}
                              onChange={(e) => {
                                const maskedValue = applyDateMask(e.target.value);
                                setMaskedDateOfBirth(maskedValue);
                                const parsedDate = parseDateFromMask(maskedValue);
                                
                                if (parsedDate) {
                                  setFormData({ ...formData, dateOfBirth: parsedDate });
                                  
                                  // Validate minimum age (must be at least 21 years old)
                                  try {
                                    const birthDate = parseISO(parsedDate);
                                    const today = startOfDay(new Date());
                                    const yearsDifference = differenceInYears(today, birthDate);
                                    if (yearsDifference < 21) {
                                      setFieldErrors(prev => ({
                                        ...prev,
                                        dateOfBirth: t('reservation.minimumAgeError') || 'En az 21 yaşında olmalısınız.'
                                      }));
                                    } else {
                                      setFieldErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors.dateOfBirth;
                                        return newErrors;
                                      });
                                    }
                                  } catch {
                                    // Invalid date
                                  }
                                } else if (maskedValue.length === 0) {
                                  setFormData({ ...formData, dateOfBirth: '' });
                                  setFieldErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.dateOfBirth;
                                    return newErrors;
                                  });
                                }
                              }}
                              onBlur={(e) => {
                                const parsedDate = parseDateFromMask(e.target.value);
                                if (!parsedDate && e.target.value.length > 0) {
                                  setFieldErrors(prev => ({
                                    ...prev,
                                    dateOfBirth: t('reservation.invalidDate') || 'Geçerli bir tarih giriniz (dd.MM.yyyy)'
                                  }));
                                  setMaskedDateOfBirth('');
                                } else if (parsedDate) {
                                  // Re-validate on blur
                                  try {
                                    const birthDate = parseISO(parsedDate);
                                    const today = startOfDay(new Date());
                                    const yearsDifference = differenceInYears(today, birthDate);
                                    if (yearsDifference < 21) {
                                      setFieldErrors(prev => ({
                                        ...prev,
                                        dateOfBirth: t('reservation.minimumAgeError') || 'En az 21 yaşında olmalısınız.'
                                      }));
                                    }
                                  } catch {
                                    setFieldErrors(prev => ({
                                      ...prev,
                                      dateOfBirth: t('reservation.invalidDate') || 'Geçerli bir tarih giriniz (dd.MM.yyyy)'
                                    }));
                                  }
                                } else {
                                  setMaskedDateOfBirth('');
                                }
                              }}
                              className={fieldErrors.dateOfBirth ? 'border-red-500' : ''}
                              maxLength={10}
                              required
                            />
                            {fieldErrors.dateOfBirth && (
                              <p className="text-sm text-red-500 mt-1">{fieldErrors.dateOfBirth}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="email">
                              {t('reservation.email') || 'E-posta Adresi'} *
                            </Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => {
                                  setFormData({ ...formData, email: e.target.value });
                                  if (fieldErrors.email) {
                                    setFieldErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.email;
                                      return newErrors;
                                    });
                                  }
                                }}
                                className={fieldErrors.email ? 'border-red-500' : ''}
                                placeholder="ad.soyad@mail.com"
                                required
                              />
                              {fieldErrors.email && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.email}</p>
                              )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="phoneCountryCode">
                              {t('reservation.phoneCountryCode') || 'Ülke Kodu'}
                            </Label>
                            <Popover open={phoneCodeOpen} onOpenChange={setPhoneCodeOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={phoneCodeOpen}
                                  className="w-full justify-between"
                                >
                                  {formData.phoneCountryCode
                                    ? countries.find((country) => country.phoneCode === formData.phoneCountryCode) 
                                      ? `${formData.phoneCountryCode} (${countries.find((country) => country.phoneCode === formData.phoneCountryCode)?.code || ''})`
                                      : formData.phoneCountryCode
                                    : t('reservation.phoneCountryCode') || 'Ülke kodu seçin'}
                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder={t('reservation.searchPhoneCode') || 'Ülke kodu ara...'} />
                                  <CommandList>
                                    <CommandEmpty>{t('reservation.noPhoneCodeFound') || 'Ülke kodu bulunamadı'}</CommandEmpty>
                                    <CommandGroup>
                                      {countries.map((country) => (
                                        <CommandItem
                                          key={country.id}
                                          value={`${country.phoneCode} ${country.name} ${country.code}`}
                                          onSelect={() => {
                                            setFormData({ ...formData, phoneCountryCode: country.phoneCode });
                                            setPhoneCodeOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              formData.phoneCountryCode === country.phoneCode ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <span className="mr-2">{country.flag || ''}</span>
                                          {country.phoneCode} ({country.code}) - {country.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="phoneNumber">
                              {t('reservation.phoneNumber') || 'Telefon Numarası'} *
                            </Label>
                              <Input
                                id="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={(e) => {
                                  setFormData({ ...formData, phoneNumber: e.target.value });
                                  if (fieldErrors.phoneNumber) {
                                    setFieldErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.phoneNumber;
                                      return newErrors;
                                    });
                                  }
                                }}
                                className={fieldErrors.phoneNumber ? 'border-red-500' : ''}
                                placeholder="XXX XXX XX XX"
                                required
                              />
                              {fieldErrors.phoneNumber && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.phoneNumber}</p>
                              )}
                          </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Driver License Info Section - Always Open */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-4 pb-4 border-b">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{t('reservation.licenseInfo') || 'Ehliyet Bilgileri'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t('reservation.licenseInfoSubtitle') || 'Ehliyet bilgilerinizi tamamlayın'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                          <Label htmlFor="licenseNumber">
                            {t('reservation.licenseNumber') || 'Ehliyet Numarası'}
                          </Label>
                          <Input
                            id="licenseNumber"
                            value={formData.licenseNumber}
                            onChange={(e) => {
                              setFormData({ ...formData, licenseNumber: e.target.value });
                              if (fieldErrors.licenseNumber) {
                                setFieldErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.licenseNumber;
                                  return newErrors;
                                });
                              }
                            }}
                            className={fieldErrors.licenseNumber ? 'border-red-500' : ''}
                          />
                          {fieldErrors.licenseNumber && (
                            <p className="text-sm text-red-500 mt-1">{fieldErrors.licenseNumber}</p>
                          )}
                        </div>
                        
                        <div>
                            <Label htmlFor="licenseIssueDate">
                              {t('reservation.licenseIssueDate') || 'Veriliş Tarihi'} *
                            </Label>
                            <Input
                              id="licenseIssueDate"
                              type="text"
                              placeholder="dd.MM.yyyy"
                              value={maskedLicenseIssueDate || (formData.licenseIssueDate ? formatDateForDisplay(formData.licenseIssueDate) : '')}
                              onChange={(e) => {
                                const maskedValue = applyDateMask(e.target.value);
                                setMaskedLicenseIssueDate(maskedValue);
                                const parsedDate = parseDateFromMask(maskedValue);
                                
                                if (parsedDate) {
                                  setFormData({ ...formData, licenseIssueDate: parsedDate });
                                  
                                  // Validate license age (must be at least 3 years old)
                                  try {
                                    const issueDate = parseISO(parsedDate);
                                    const today = startOfDay(new Date());
                                    const yearsDifference = differenceInYears(today, issueDate);
                                    if (yearsDifference < 3) {
                                      setLicenseAgeError(true);
                                      setFieldErrors(prev => ({
                                        ...prev,
                                        licenseIssueDate: t('reservation.licenseAgeError') || 'Ehliyet en az 3 yaşında olmalıdır.'
                                      }));
                                    } else {
                                      setLicenseAgeError(false);
                                      setFieldErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors.licenseIssueDate;
                                        return newErrors;
                                      });
                                    }
                                  } catch {
                                    // Invalid date
                                  }
                                } else if (maskedValue.length === 0) {
                                  setFormData({ ...formData, licenseIssueDate: '' });
                                  setLicenseAgeError(false);
                                  setFieldErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors.licenseIssueDate;
                                    return newErrors;
                                  });
                                }
                              }}
                              onBlur={(e) => {
                                const parsedDate = parseDateFromMask(e.target.value);
                                if (!parsedDate && e.target.value.length > 0) {
                                  setFieldErrors(prev => ({
                                    ...prev,
                                    licenseIssueDate: t('reservation.invalidDate') || 'Geçerli bir tarih giriniz (dd.MM.yyyy)'
                                  }));
                                } else if (parsedDate) {
                                  // Re-validate on blur
                                  try {
                                    const issueDate = parseISO(parsedDate);
                                    const today = startOfDay(new Date());
                                    const yearsDifference = differenceInYears(today, issueDate);
                                    if (yearsDifference < 3) {
                                      setLicenseAgeError(true);
                                      setFieldErrors(prev => ({
                                        ...prev,
                                        licenseIssueDate: t('reservation.licenseAgeError') || 'Ehliyet en az 3 yaşında olmalıdır.'
                                      }));
                                    }
                                  } catch {
                                    setFieldErrors(prev => ({
                                      ...prev,
                                      licenseIssueDate: t('reservation.invalidDate') || 'Geçerli bir tarih giriniz (dd.MM.yyyy)'
                                    }));
                                  }
                                } else {
                                  setMaskedDateOfBirth('');
                                }
                              }}
                              className={(fieldErrors.licenseIssueDate || licenseAgeError) ? 'border-red-500' : ''}
                              maxLength={10}
                              required
                            />
                            {(fieldErrors.licenseIssueDate || licenseAgeError) && (
                              <p className="text-sm text-red-500 mt-1">
                                {fieldErrors.licenseIssueDate || (licenseAgeError ? (t('reservation.licenseAgeError') || 'Ehliyet en az 3 yaşında olmalıdır.') : '')}
                              </p>
                            )}
                          </div>
                        
                        <div>
                          <Label htmlFor="licenseCountry">
                            {t('reservation.licenseCountry') || 'Ehliyet Ülkesi'} *
                          </Label>
                          <Popover open={licenseCountryOpen} onOpenChange={setLicenseCountryOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={licenseCountryOpen}
                                className="w-full justify-between"
                              >
                                {formData.licenseCountry
                                  ? countries.find((country) => country.code === formData.licenseCountry)?.name || formData.licenseCountry
                                  : t('reservation.selectLicenseCountry') || 'Ehliyet ülkesi seçin'}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder={t('reservation.searchCountry') || 'Ülke ara...'} />
                                <CommandList>
                                  <CommandEmpty>{t('reservation.noCountryFound') || 'Ülke bulunamadı'}</CommandEmpty>
                                  <CommandGroup>
                                    {countries.map((country) => (
                                      <CommandItem
                                        key={country.id}
                                        value={`${country.name} ${country.code}`}
                                        onSelect={() => {
                                          setFormData({ ...formData, licenseCountry: country.code });
                                          setLicenseCountryOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            formData.licenseCountry === country.code ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span className="mr-2">{country.flag || ''}</span>
                                        {country.name} ({country.code})
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {fieldErrors.licenseCountry && (
                            <p className="text-sm text-red-500 mt-1">{fieldErrors.licenseCountry}</p>
                          )}
                        </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location Details Section - Always Open if needed */}
                {(isAirport('pickup') || isHotel('pickup') || isAddress('pickup') ||
                  isAirport('dropoff') || isHotel('dropoff') || isAddress('dropoff')) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-4 pb-4 border-b">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">{t('reservation.locationDetails') || 'Alış / Dönüş Detayları'}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t('reservation.locationDetailsSubtitle') || 'Lokasyon tipine göre detay bilgileri'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                          {/* Pickup Location Details */}
                        {isAirport('pickup') && (
                          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              {t('reservation.pickupDetails') || 'Alış Detayları'}
                            </h4>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="pickupFlightNumber">
                                  {t('reservation.pickupFlightNumber') || 'Uçuş Numarası'} *
                                </Label>
                                <Input
                                  id="pickupFlightNumber"
                                  value={formData.pickupFlightNumber}
                                  onChange={(e) => setFormData({ ...formData, pickupFlightNumber: e.target.value.toUpperCase() })}
                                  placeholder={t('reservation.pickupFlightNumberPlaceholder') || 'Örn: TK1234'}
                                  className={!formData.pickupFlightNumber ? 'border-red-300' : ''}
                                />
                              </div>
                              <div>
                                <Label htmlFor="pickupFlightDescription">
                                  {t('reservation.pickupFlightDescription') || 'Açıklama'}
                                </Label>
                                <Input
                                  id="pickupFlightDescription"
                                  value={formData.pickupFlightDescription}
                                  onChange={(e) => setFormData({ ...formData, pickupFlightDescription: e.target.value })}
                                  placeholder={t('reservation.pickupFlightDescriptionPlaceholder') || 'Uçuş ile ilgili ek bilgiler (opsiyonel)'}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {isHotel('pickup') && (
                          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              {t('reservation.pickupDetails') || 'Alış Detayları'}
                            </h4>
                            <div>
                              <Label htmlFor="pickupHotelName">
                                {t('reservation.pickupHotelName') || 'Otel Adı'} *
                              </Label>
                              <Input
                                id="pickupHotelName"
                                value={formData.pickupHotelName}
                                onChange={(e) => {
                                  setFormData({ ...formData, pickupHotelName: e.target.value });
                                  if (fieldErrors.pickupHotelName) {
                                    setFieldErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.pickupHotelName;
                                      return newErrors;
                                    });
                                  }
                                }}
                                placeholder={t('reservation.pickupHotelNamePlaceholder') || 'Otel adını giriniz'}
                                className={fieldErrors.pickupHotelName ? 'border-red-500' : ''}
                              />
                              {fieldErrors.pickupHotelName && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.pickupHotelName}</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {isAddress('pickup') && (
                          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              {t('reservation.pickupDetails') || 'Alış Detayları'}
                            </h4>
                            <div>
                              <Label htmlFor="pickupAddress">
                                {t('reservation.pickupAddress') || 'Alış Adresi'} *
                              </Label>
                              <Input
                                id="pickupAddress"
                                value={formData.pickupAddress}
                                onChange={(e) => {
                                  setFormData({ ...formData, pickupAddress: e.target.value });
                                  if (fieldErrors.pickupAddress) {
                                    setFieldErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.pickupAddress;
                                      return newErrors;
                                    });
                                  }
                                }}
                                placeholder={t('reservation.pickupAddressPlaceholder') || 'Alış adresini giriniz'}
                                className={fieldErrors.pickupAddress ? 'border-red-500' : ''}
                              />
                              {fieldErrors.pickupAddress && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.pickupAddress}</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Dropoff Location Details */}
                        {isAirport('dropoff') && (
                          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              {t('reservation.dropoffDetails') || 'İade Detayları'}
                            </h4>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="dropoffFlightNumber">
                                  {t('reservation.dropoffFlightNumber') || 'Uçuş Numarası'} *
                                </Label>
                                <Input
                                  id="dropoffFlightNumber"
                                  value={formData.dropoffFlightNumber}
                                  onChange={(e) => {
                                    setFormData({ ...formData, dropoffFlightNumber: e.target.value.toUpperCase() });
                                    if (fieldErrors.dropoffFlightNumber) {
                                      setFieldErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors.dropoffFlightNumber;
                                        return newErrors;
                                      });
                                    }
                                  }}
                                  placeholder={t('reservation.dropoffFlightNumberPlaceholder') || 'Örn: TK1234'}
                                  className={fieldErrors.dropoffFlightNumber ? 'border-red-500' : ''}
                                />
                                {fieldErrors.dropoffFlightNumber && (
                                  <p className="text-sm text-red-500 mt-1">{fieldErrors.dropoffFlightNumber}</p>
                                )}
                              </div>
                              <div>
                                <Label htmlFor="dropoffFlightDescription">
                                  {t('reservation.dropoffFlightDescription') || 'Açıklama'}
                                </Label>
                                <Input
                                  id="dropoffFlightDescription"
                                  value={formData.dropoffFlightDescription}
                                  onChange={(e) => setFormData({ ...formData, dropoffFlightDescription: e.target.value })}
                                  placeholder={t('reservation.dropoffFlightDescriptionPlaceholder') || 'Uçuş ile ilgili ek bilgiler (opsiyonel)'}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {isHotel('dropoff') && (
                          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              {t('reservation.dropoffDetails') || 'İade Detayları'}
                            </h4>
                            <div>
                              <Label htmlFor="dropoffHotelName">
                                {t('reservation.dropoffHotelName') || 'Otel Adı'} *
                              </Label>
                              <Input
                                id="dropoffHotelName"
                                value={formData.dropoffHotelName}
                                onChange={(e) => {
                                  setFormData({ ...formData, dropoffHotelName: e.target.value });
                                  if (fieldErrors.dropoffHotelName) {
                                    setFieldErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.dropoffHotelName;
                                      return newErrors;
                                    });
                                  }
                                }}
                                placeholder={t('reservation.dropoffHotelNamePlaceholder') || 'Otel adını giriniz'}
                                className={fieldErrors.dropoffHotelName ? 'border-red-500' : ''}
                              />
                              {fieldErrors.dropoffHotelName && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.dropoffHotelName}</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {isAddress('dropoff') && (
                          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              {t('reservation.dropoffDetails') || 'İade Detayları'}
                            </h4>
                            <div>
                              <Label htmlFor="dropoffAddress">
                                {t('reservation.dropoffAddress') || 'İade Adresi'} *
                              </Label>
                              <Input
                                id="dropoffAddress"
                                value={formData.dropoffAddress}
                                onChange={(e) => {
                                  setFormData({ ...formData, dropoffAddress: e.target.value });
                                  if (fieldErrors.dropoffAddress) {
                                    setFieldErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.dropoffAddress;
                                      return newErrors;
                                    });
                                  }
                                }}
                                placeholder={t('reservation.dropoffAddressPlaceholder') || 'İade adresini giriniz'}
                                className={fieldErrors.dropoffAddress ? 'border-red-500' : ''}
                              />
                              {fieldErrors.dropoffAddress && (
                                <p className="text-sm text-red-500 mt-1">{fieldErrors.dropoffAddress}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment Method Section - Always Open */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-4 pb-4 border-b">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{t('reservation.paymentMethod') || 'Ödeme Yöntemi'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t('reservation.paymentMethodSubtitle') || 'Ödeme yönteminizi seçin'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Payment Method Selection - Button Style */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Cash Payment */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={`relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                              paymentMethod === 'cash'
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-primary/50'
                            }`}
                          >
                            <div className="flex flex-col items-center text-center space-y-2">
                              <div className={`p-3 rounded-full ${
                                paymentMethod === 'cash'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <Banknote className="h-6 w-6" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">
                                  {t('reservation.payCashAtDelivery') || 'Teslimatta Nakit Öde'}
                                </h4>
                              </div>
                              {paymentMethod === 'cash' && (
                                <CheckCircle2 className="h-5 w-5 text-primary absolute top-2 right-2" />
                              )}
                            </div>
                          </button>
                          
                          {/* Card at Office Payment */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('card_at_office')}
                            className={`relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                              paymentMethod === 'card_at_office'
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-primary/50'
                            }`}
                          >
                            <div className="flex flex-col items-center text-center space-y-2">
                              <div className={`p-3 rounded-full ${
                                paymentMethod === 'card_at_office'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                <CreditCard className="h-6 w-6" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">
                                  {t('reservation.payCardAtDelivery') || 'Teslimatta KK ile Öde'}
                                </h4>
                              </div>
                              {paymentMethod === 'card_at_office' && (
                                <CheckCircle2 className="h-5 w-5 text-primary absolute top-2 right-2" />
                              )}
                            </div>
                          </button>
                          
                          {/* Online Payment */}
                          {creditCardPaymentEnabled && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('online')}
                              className={`relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                                paymentMethod === 'online'
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-gray-200 bg-white hover:border-primary/50'
                              }`}
                            >
                              <div className="flex flex-col items-center text-center space-y-2">
                                <div className={`p-3 rounded-full ${
                                  paymentMethod === 'online'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <CreditCard className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">
                                    {t('reservation.payOnline') || 'Online Öde'}
                                  </h4>
                                </div>
                                {paymentMethod === 'online' && (
                                  <CheckCircle2 className="h-5 w-5 text-primary absolute top-2 right-2" />
                                )}
                              </div>
                            </button>
                          )}
                        </div>
                        
                        {/* Card Details - Only show if online payment is selected */}
                        {paymentMethod === 'online' && (
                          <div className="pt-4 border-t space-y-4">
                            <div>
                              <Label htmlFor="cardNumber">
                                {t('reservation.cardNumber') || 'Kart Numarası'} *
                              </Label>
                              <Input
                                id="cardNumber"
                                value={formData.cardNumber}
                                onChange={(e) => {
                                  const formatted = formatCardNumber(e.target.value);
                                  setFormData({ ...formData, cardNumber: formatted });
                                }}
                                placeholder="1234 5678 9012 3456"
                                maxLength={19}
                                required
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="cardHolderName">
                                {t('reservation.cardHolderName') || 'Kart Sahibi Adı'} *
                              </Label>
                              <Input
                                id="cardHolderName"
                                value={formData.cardHolderName}
                                onChange={(e) => setFormData({ ...formData, cardHolderName: e.target.value.toUpperCase() })}
                                placeholder="JOHN DOE"
                                required
                              />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="expiryMonth">
                                  {t('reservation.expiryMonth') || 'Ay'} *
                                </Label>
                                <Select
                                  value={formData.expiryMonth}
                                  onValueChange={(value) => setFormData({ ...formData, expiryMonth: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="MM" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => {
                                      const month = String(i + 1).padStart(2, '0');
                                      return (
                                        <SelectItem key={month} value={month}>
                                          {month}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="expiryYear">
                                  {t('reservation.expiryYear') || 'Yıl'} *
                                </Label>
                                <Select
                                  value={formData.expiryYear}
                                  onValueChange={(value) => setFormData({ ...formData, expiryYear: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="YYYY" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 20 }, (_, i) => {
                                      const year = String(new Date().getFullYear() + i);
                                      return (
                                        <SelectItem key={year} value={year}>
                                          {year}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="cvv">
                                  {t('reservation.cvv') || 'CVV'} *
                                </Label>
                                <Input
                                  id="cvv"
                                  type="password"
                                  value={formData.cvv}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    if (value.length <= 4) {
                                      setFormData({ ...formData, cvv: value });
                                    }
                                  }}
                                  placeholder="123"
                                  maxLength={4}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>

                {/* Important Information */}
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">
                      {t('reservation.importantInfo') || 'Rezervasyon ile İlgili Önemli Bilgiler'}
                    </h4>
                    <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                      <li>
                        {t('reservation.importantInfo1') || 'Araç teslimi için sürücü belgesi, TC kimlik numaralı sürücü belgesi/Latin alfabesi sürücü belgesi/pasaport, Latin alfabesi olmayan sürücü belgeleri için yeminli tercüme ve pasaport giriş damgası geçerliliği (6 aydan az) gereklidir.'}
                      </li>
                      <li>
                        {t('reservation.importantInfo2') || 'Teminat tutarı araç grubuna göre değişiklik göstermektedir. Rezervasyonu yapan kişinin kredi kartı gereklidir. Araç aynı durumda teslim edilirse 7 gün içinde iade edilir. Rezervasyonu yapan kişinin teslim sırasında bulunması gerekmektedir.'}
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Submit Button - Desktop Only */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="hidden lg:block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold  text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  {isSubmitting 
                    ? (t('reservation.submitting') || 'Gönderiliyor...') 
                    : (t('reservation.completeReservation') || 'Rezervasyonu Tamamla')
                  }
                </Button>
              </form>
                </div>
              </div>
            </div>

            {/* Mobile Bottom Bar - Total Price + Submit Button - Fixed above BottomNavigator */}
            <div className="lg:hidden sticky bottom-[3rem] left-0 right-0 bg-background border-t shadow-lg z-[110]">
                {/* Total Price */}
                <div className="px-3 sm:px-4 py-2 border-b bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">
                      {t('reservation.total') || 'Toplam Fiyat'}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {totalPrice.toLocaleString()} {currencySymbol}
                    </span>
                  </div>
                </div>
                {/* Submit Button */}
                <div className="p-3 sm:p-4">
                  <Button
                    type="submit"
                    form="reservation-form"
                    disabled={isSubmitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    size="lg"
                  >
                    {isSubmitting 
                      ? (t('reservation.submitting') || 'Gönderiliyor...') 
                      : (t('reservation.completeReservation') || 'Rezervasyonu Tamamla')
                    }
                  </Button>
                </div>
              </div>

          {/* Right Side - Summary (Desktop Only) */}
          <div className="hidden lg:block lg:w-1/3 bg-muted/30 p-6 border-l">
            <div className="sticky top-6">
                <h2 className="text-xl font-bold mb-4">
                  {t('reservation.summary') || 'Rezervasyon Özeti'}
                </h2>

                {/* Vehicle Info */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <img
                        src={imageUrl}
                        alt={vehicle.name}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-vehicle.jpg';
                        }}
                      />
                      <h3 className="font-bold text-lg mb-1">
                        {vehicle.brand?.name} {vehicle.model?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {typeof vehicle.category === 'object' 
                          ? vehicle.category?.name 
                          : vehicle.categoryName || vehicle.category || vehicle.segment}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {vehicle.fuelType && (
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                            {formatFuelType(vehicle.fuelType)}
                          </span>
                        )}
                        {vehicle.transmission && (
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                            {formatTransmission(vehicle.transmission)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location & Date Info */}
                <Card className="mb-4">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t('reservation.pickup') || 'Alış'}
                        </p>
                        <p className="text-sm font-medium">
                          {pickupLocation?.name || pickupLocation?.title || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pickupDate && formatDate(pickupDate)} {pickupTime}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t('reservation.dropoff') || 'Dönüş'}
                        </p>
                        <p className="text-sm font-medium">
                          {dropoffLocation?.name || dropoffLocation?.title || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dropoffDate && formatDate(dropoffDate)} {dropoffTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t('reservation.rentalPeriod') || 'Kiralama Süresi'}
                        </p>
                        <p className="text-sm font-medium">
                          {rentalDays} {t('vehicleSearch.day') || 'Gün'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Price Summary */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t('reservation.vehicleRental') || 'Araç Kiralama'}
                        </span>
                        <span className="font-medium">
                          {(vehicle.totalPrice || vehicle.dailyPrice! * rentalDays || 0).toLocaleString()} {currencySymbol}
                        </span>
                      </div>
                      {Array.from(selectedExtras).map(extraId => {
                        const extra = extras.find(e => e.id === extraId);
                        if (!extra) return null;
                        return (
                          <div key={extraId} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{extra.name}</span>
                            <span className="font-medium">
                              {calculateExtraPrice(extra).toLocaleString()} {currencySymbol}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">
                          {t('reservation.total') || 'Toplam'}
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {totalPrice.toLocaleString()} {currencySymbol}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
    
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ReservationModal;

# Rent a Car Website - Kapsamlı Proje Analizi

## 📋 Genel Bakış

Bu proje, bir SaaS (Software as a Service) araç kiralama platformu için geliştirilmiş modern bir React/TypeScript frontend uygulamasıdır. Proje, multi-tenant yapıda çalışan bir API'ye bağlanır ve farklı araç kiralama şirketleri için özelleştirilebilir bir web sitesi sunar.

### Temel Özellikler
- 🚗 Araç kiralama ve transfer hizmetleri
- 🌍 Çoklu dil desteği (i18n)
- 💱 Çoklu para birimi desteği
- 👤 Müşteri hesap yönetimi (kayıt, giriş, profil, rezervasyonlar)
- 📍 Dinamik lokasyon yönetimi (parent-child yapısı)
- 🎨 Modern, responsive UI/UX
- 🔍 Gelişmiş arama ve filtreleme
- 📱 Mobil uyumlu tasarım
- 🔐 JWT tabanlı authentication

---

## 🛠 Teknoloji Stack

### Frontend Framework & Build Tools
- **React 18.3.1** - UI framework
- **TypeScript 5.5.3** - Type safety
- **Vite 5.4.1** - Build tool ve development server
- **React Router DOM 6.26.2** - Client-side routing

### UI Framework & Styling
- **Tailwind CSS 3.4.11** - Utility-first CSS framework
- **shadcn/ui** - Radix UI tabanlı component library
- **Radix UI** - Headless UI component primitives
  - Dialog, Dropdown, Select, Popover, Tabs, Accordion, Toast, vb.
- **Lucide React** - Icon library
- **CSS Variables** - Design system için HSL color system

### State Management & Data Fetching
- **React Context API** - Global state management
  - `TranslationContext` - Dil yönetimi
  - `CustomerAuthContext` - Müşteri authentication
- **TanStack React Query 5.56.2** - Server state management
- **localStorage** - Client-side data persistence

### Form Management & Validation
- **React Hook Form 7.61.1** - Form state management
- **Zod 3.23.8** - Schema validation
- **@hookform/resolvers 3.9.0** - Form validation resolvers

### Utilities & Helpers
- **date-fns 3.6.0** - Date manipulation (format, parseISO, addDays, vb.)
- **react-helmet-async 2.0.5** - SEO meta tag management
- **class-variance-authority** - Component variant management
- **clsx & tailwind-merge** - Conditional classNames

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript linting
- **PostCSS & Autoprefixer** - CSS processing

---

## 📁 Proje Yapısı

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── Header.tsx      # Site header (logo, nav, language, currency)
│   ├── Footer.tsx      # Site footer
│   ├── SearchForm.tsx  # Ana arama formu (araç kiralama & transfer)
│   ├── VehicleSearch.tsx (pages altında olmalı)
│   ├── ReservationModal.tsx
│   ├── EditSearchModal.tsx
│   ├── FloatingContactButtons.tsx
│   └── ...
├── pages/              # Route components
│   ├── Index.tsx       # Ana sayfa
│   ├── VehicleSearch.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Profile.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   └── ...
├── services/           # API service layer
│   ├── api.ts          # Genel API calls (locations, vehicles, blog, vb.)
│   └── customerApi.ts  # Müşteri API calls (auth, profile, reservations)
├── contexts/           # React Context providers
│   ├── TranslationContext.tsx
│   └── CustomerAuthContext.tsx
├── hooks/              # Custom React hooks
│   ├── useAuthInit.ts  # SaaS authentication initialization
│   ├── use-toast.ts
│   └── use-mobile.tsx
├── types/              # TypeScript type definitions
│   ├── index.ts        # Genel types (Language, Currency, Location, vb.)
│   ├── customer.ts
│   ├── vehicle.ts
│   ├── reservation.ts
│   └── extra.ts
├── config/             # Configuration files
│   └── api.ts          # API base URL, tenant ID configuration
├── locales/            # Translation files (i18n)
│   ├── tr.json
│   ├── en.json
│   ├── de.json
│   ├── ru.json
│   ├── da.json
│   └── sv.json
├── utils/              # Utility functions
│   ├── languageMapper.ts
│   └── emailTemplate.ts
├── lib/                # Library utilities
│   └── utils.ts        # cn() function (className merger)
├── App.tsx             # Root component, routing setup
└── main.tsx            # Entry point
```

---

## 🔌 API Entegrasyonu

### API Base URL Konfigürasyonu

**Dosya:** `src/config/api.ts`

```typescript
// Production: https://berg.saastour360.com/api
// Environment variable: VITE_API_BASE_URL
export const API_BASE_URL = getApiBaseUrl();

// Tenant ID (hardcoded veya environment variable)
export const TENANT_ID = '9930c947-f720-463c-ba1d-e1af921d5ffb';
export const getTenantId = (): string => {
  return import.meta.env.VITE_TENANT_ID || TENANT_ID;
};

// Static asset URL helper
export const getApiAssetUrl = (path: string): string => {
  // API base URL'den /api'yi kaldırır
  let baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${path}`;
};
```

### Ana API Endpoints (`src/services/api.ts`)

#### Authentication (SaaS Tenant)
- `POST /auth/login` - SaaS tenant authentication
  - Body: `{ email, password }`
  - Response: `{ token, user, tenant, settings }`
  - Token localStorage'a kaydedilir

#### Public Endpoints (Token gerektirmez)
- `GET /languages` - Aktif diller listesi
- `GET /currencies` - Para birimleri listesi
- `GET /countries` - Ülkeler listesi (nationality, phone codes)
- `GET /destinations?tenantId={id}&languageId={id}` - Popüler destinasyonlar
- `GET /blog?tenantId={id}&languageId={id}` - Blog yazıları
- `GET /categories?tenantId={id}&languageId={id}` - Araç kategorileri

#### Lokasyon Yönetimi
- `GET /rentacar/locations?tenantId={id}` - Tüm lokasyonlar (parent-child yapısı)
  - Response format: Nested structure ile `location` object'i içerir
  - Parent lokasyonlar: `parentId: null`
  - Child lokasyonlar: `parentId: <parent-id>`
  
- `POST /rentacar/locations` - Lokasyon ekleme (SaaS için)
  - Body: `{ tenantId, locationId, includeParents: true }`

#### Araç Arama ve Rezervasyon
- `GET /rentacar/vehicles/search?{params}` - Araç arama
  - Query params:
    - `tenantId` (required)
    - `pickupLocationId` (required)
    - `dropoffLocationId` (required)
    - `pickupDate` (required, format: YYYY-MM-DD)
    - `dropoffDate` (required, format: YYYY-MM-DD)
    - `pickupTime` (optional, default: 10:00)
    - `dropoffTime` (optional, default: 10:00)
    - `languageId` (optional)
    - `currencyId` (optional)
    - `segment` (optional) - Kategori filtresi
    - `vehicleType` (optional)
    - `transmission` (optional)
    - `fuelType` (optional)
    - `sortBy` (optional)
    - `promoCode` (optional)
  - Response: `{ vehicles: [], extras: [] }`

- `POST /rentacar/reservations` - Rezervasyon oluşturma
  - Headers: `Authorization: Bearer {token}` (optional, SaaS token)
  - Body: `{ tenantId, ...reservationData }`

#### Email
- `POST /mail/send` - Email gönderme
  - Headers: `Authorization: Bearer {token}` (optional)
  - Body: `{ tenantId, to, subject, html }`

### Müşteri API Endpoints (`src/services/customerApi.ts`)

#### Authentication
- `POST /customers/auth/login` - Müşteri girişi
  - Body: `{ email | idNumber, password, tenantId }`
  - Response: `{ success, data: { token, customer, tenant } }`

- `POST /customers/auth/forgot-password` - Şifre sıfırlama talebi
  - Body: `{ email | idNumber, tenantId }`

- `POST /customers/auth/reset-password` - Şifre sıfırlama
  - Body: `{ token, newPassword, tenantId }`

- `POST /customers/auth/logout` - Çıkış
  - Headers: `Authorization: Bearer {token}`

#### Profile & Reservations
- `GET /customers/auth/me` - Müşteri profil bilgileri
  - Headers: `Authorization: Bearer {token}`
  - Response: `{ success, data: CustomerProfile }`

- `PUT /customers/auth/me` - Profil güncelleme
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ tenantId, ...profileData }`

- `GET /customers/auth/reservations` - Müşteri rezervasyonları
  - Headers: `Authorization: Bearer {token}`
  - Response: `{ success, data: CustomerReservation[] }`

- `POST /customers/auth/change-password` - Şifre değiştirme
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ currentPassword, newPassword }`

---

## 🔐 Authentication & Authorization

### İki Seviyeli Authentication

#### 1. SaaS Tenant Authentication (Backend için)
**Hook:** `src/hooks/useAuthInit.ts`

- Uygulama başlangıcında otomatik login yapar
- Environment variables: `VITE_SAAS_EMAIL`, `VITE_SAAS_PASSWORD`
- Token localStorage'a kaydedilir: `localStorage.setItem('token', token)`
- Tenant settings localStorage'a kaydedilir: `localStorage.setItem('tenantSettings', JSON.stringify({ tenant, settings }))`

```typescript
// useAuthInit.ts mantığı:
// 1. localStorage'dan token ve tenantSettings kontrol eder
// 2. Yoksa API'ye login isteği gönderir
// 3. Token ve tenantSettings'i localStorage'a kaydeder
// 4. Uygulama başlatılır
```

#### 2. Customer Authentication (Frontend için)
**Context:** `src/contexts/CustomerAuthContext.tsx`

- Müşteri login/logout işlemleri
- Token localStorage'da: `localStorage.setItem('customerToken', token)`
- Profile localStorage'da: `localStorage.setItem('customerProfile', JSON.stringify(profile))`
- JWT token kullanılır: `Authorization: Bearer {token}`

---

## 🗺 Routing Yapısı

**Dosya:** `src/App.tsx`

```typescript
// Route yapısı:
/                           → Index (Ana sayfa)
/vehicles/search            → VehicleSearch (Araç arama sonuçları)
/login                      → Login
/register                   → Register
/forgot-password            → ForgotPassword
/reset-password             → ResetPassword (token query param ile)
/profile                    → Profile (Müşteri profili)
/reservations               → Reservations
/help-center                → HelpCenter
/contact-us                 → ContactUs
/faq                        → FAQ
/live-chat                  → LiveChat
/company-info               → CompanyInfo
/destination/:slug          → DestinationDetail
/destinations               → AllDestinations
/blog/:slug                 → BlogDetail
/reservation-success        → ReservationSuccess
/aydinlatma-metni           → AydinlatmaMetni
/cerez-aydinlatma-politikasi → CerezAydinlatmaPolitikasi
/kvk-politikasi             → KVKPolitikasi
/yonetim-bilgi-sistemleri-politikasi → YonetimBilgiSistemleriPolitikasi
/cerez-ayarlari             → CerezAyarlari
*                           → NotFound (404)
```

**Provider Hierarchy:**
```
HelmetProvider
  └─ QueryClientProvider
      └─ TranslationProvider
          └─ CustomerAuthProvider
              └─ TooltipProvider
                  └─ BrowserRouter
                      └─ Routes
```

---

## 🌐 Internationalization (i18n)

### Translation System

**Context:** `src/contexts/TranslationContext.tsx`

- JSON tabanlı translation files: `src/locales/{lang}.json`
- Desteklenen diller: TR, EN, DE, RU, DA, SV
- Browser language detection (otomatik dil seçimi)
- localStorage'da dil tercihi saklanır
- Translation key format: `category.key.subkey` (nested)

**Kullanım:**
```typescript
const { t, currentLanguage, setCurrentLanguage } = useTranslation();
t('header.carCategories') // → "Araç Kategorileri"
```

**Locale Sync Script:**
- `npm run sync-locales` - API'den yeni dilleri çeker, locale dosyaları oluşturur/günceller
- Script: `scripts/sync-locales.js`
- Base locale: `tr.json`

---

## 💱 Multi-Currency System

- API'den currencies çekilir: `GET /currencies`
- Seçilen currency localStorage'a kaydedilir: `localStorage.setItem('selectedCurrencyId', id)`
- Currency değiştiğinde custom event: `window.dispatchEvent(new CustomEvent('currencyChanged'))`
- VehicleSearch sayfası currency değişikliğini dinler ve araçları yeniden çeker

---

## 📍 Lokasyon Yönetimi

### Parent-Child Yapısı

Lokasyonlar nested (parent-child) yapısında gelir:

```typescript
interface PickupLocation {
  id: string | number;
  locationId?: string | number;
  name: string;
  title?: string;
  type: 'airport' | 'office' | 'hotel' | 'port';
  parentId: string | number | null;
  children?: PickupLocation[];
  drops?: PickupLocation[];
  translations?: LocationTranslation[];
}
```

**Önemli Mantık:**
- Parent lokasyonlar: `parentId === null`
- Child lokasyonlar: `parentId !== null`
- API'ye gönderilirken: Child lokasyon seçilirse, parent'ın ID'si gönderilir (`getMainLocationId()`)
- Default location: Alanya Ofis (ID: `f5625967-4d03-4a29-8b38-c17572da1cc2`)

**API Response Normalization:**
API response'unda `location` object'i nested gelebilir. `SearchForm.tsx` ve `VehicleSearch.tsx`'te normalize edilir.

---

## 🎨 Styling & Design System

### Tailwind CSS + CSS Variables

**Dosya:** `src/index.css`

- HSL color system kullanılır
- CSS variables ile theme yönetimi
- Dark mode desteği (varsayılan: light mode)
- Design tokens:
  - Primary: `hsl(215 100% 35%)` (Mavi)
  - Secondary, Muted, Accent, Destructive
  - Border, Input, Ring
  - Radius: `0.5rem`

**Tailwind Config:** `tailwind.config.ts`
- Container: center, padding: 2rem
- Custom animations: accordion-down, accordion-up
- Plugin: tailwindcss-animate

### Component Library

**shadcn/ui components:**
- Tüm component'ler `src/components/ui/` altında
- Radix UI primitives kullanılır
- Styled with Tailwind CSS
- Variant-based styling (class-variance-authority)

---

## 🔍 Önemli Özellikler

### 1. Search Form (`src/components/SearchForm.tsx`)

**İki mod:**
- **Rental Car Search** (default)
  - Pickup/Dropoff location
  - Pickup/Dropoff date & time
  - Same location checkbox
  - Default dates: tomorrow + 7 days later
  
- **Transfer Search**
  - Pickup/Dropoff location
  - Pickup date & time
  - Number of passengers
  - Default date: tomorrow

**Özellikler:**
- Location cache (localStorage, 1 gün)
- Default location: Alanya Ofis
- Parent-child location handling
- Date validation (dropoff > pickup)
- Search params URL'e yazılır: `/vehicles/search?{params}`
- Search data localStorage'a kaydedilir: `searchLocationData`

### 2. Vehicle Search (`src/pages/VehicleSearch.tsx`)

**Özellikler:**
- URL params'tan search criteria okur
- Filtreleme: Segment, Vehicle Type, Transmission, Fuel Type
- Sıralama: Price, Name, vb.
- Promo code support
- Edit search modal (EditSearchModal)
- Reservation modal (ReservationModal)
- Currency change listener
- Location name display (localStorage'dan veya API'den)

### 3. Reservation Modal (`src/components/ReservationModal.tsx`)

**Multi-step form:**
1. **Extras Selection** - Ek ürünler seçimi
2. **Personal Info** - Kişisel bilgiler
3. **License Info** - Ehliyet bilgileri (2 yıl geçerlilik kontrolü)
4. **Address Info** - Adres bilgileri
5. **Payment Info** - Ödeme bilgileri

**Özellikler:**
- Driver license age validation (min 2 years)
- Country selection (searchable select, nationality → phone code auto-update)
- Form validation
- Rental conditions & consent checkboxes

### 4. Profile Page (`src/pages/Profile.tsx`)

**Özellikler:**
- Editable profile information
- Password change
- Reservations list
- Reservation detail modal
- Wallet information (balance, total earned, total spent)

### 5. Header (`src/components/Header.tsx`)

**Özellikler:**
- Logo (API'den veya static)
- Phone number (tenant settings'den)
- Language selector (dropdown)
- Currency selector (dropdown)
- Car Categories dropdown (kategori seçince otomatik arama)
- Top Destinations dropdown
- Support dropdown (Help Center, Contact, FAQ, Live Chat)
- Customer login/profile dropdown
- Mobile menu (Sheet component)

### 6. SEO Implementation

**Component:** `src/components/SEO.tsx`

- React Helmet Async kullanılır
- Dynamic meta tags
- Open Graph tags
- Twitter Card tags
- Canonical URLs
- Noindex support

---

## 🔧 Environment Variables

**.env dosyası:**
```env
VITE_API_BASE_URL=https://berg.saastour360.com/api
VITE_TENANT_ID=9930c947-f720-463c-ba1d-e1af921d5ffb
VITE_SAAS_EMAIL=support@bergrentacar.com
VITE_SAAS_PASSWORD=Password123!
```

---

## 📦 Build & Deployment

### Build Commands

```bash
npm run dev          # Development server (port 8080)
npm run build        # Production build
npm run build:dev    # Development mode build
npm run preview      # Preview production build
npm run deploy       # Deploy script (bash deploy.sh)
npm run sync-locales # Sync locale files from API
```

### Build Output

- **Output directory:** `dist/`
- **Assets directory:** `dist/assets/`
- **Code splitting:** Vendor chunks (react, ui, utils)
- **Base path:** `/` (SPA routing)

### Deployment

**Script:** `deploy.sh`
- FTP/SFTP upload
- Server: 153.92.220.225
- Remote path: `/public_html`
- Context: `./dist` (dist klasörünün içeriği upload edilir)

---

## 🔑 Önemli Konfigürasyonlar

### 1. Tenant ID
- Hardcoded: `9930c947-f720-463c-ba1d-e1af921d5ffb`
- Environment variable ile override edilebilir: `VITE_TENANT_ID`

### 2. Default Location
- Alanya Ofis: `f5625967-4d03-4a29-8b38-c17572da1cc2`
- SearchForm'da varsayılan olarak seçilir

### 3. Default Dates
- Pickup: Tomorrow
- Dropoff: 7 days later (pickup'den sonra)

### 4. Default Times
- Pickup time: `10:00`
- Dropoff time: `10:00`

---

## 📝 Type Definitions

### Önemli Types

**Location Types:**
```typescript
interface PickupLocation {
  id: string | number;
  locationId?: string | number;
  name: string;
  title?: string;
  type: 'airport' | 'office' | 'hotel' | 'port';
  parentId: string | number | null;
  children?: PickupLocation[];
  drops?: PickupLocation[];
  translations?: LocationTranslation[];
}
```

**Vehicle Types:**
```typescript
interface Vehicle {
  id: string;
  name: string;
  category: VehicleCategory | string;
  brand?: VehicleBrand;
  model?: VehicleModel;
  images?: VehicleImage[];
  totalPrice?: number;
  dailyPrice?: number;
  currencyCode: string;
  // ...
}

interface VehicleFilter {
  segment?: string;
  vehicleType?: string;
  transmission?: string;
  fuelType?: string;
  sortBy?: string;
}
```

**Customer Types:**
```typescript
interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  mobilePhone: string;
  tenantId: string;
  // ...
}

interface CustomerProfile {
  customer: Customer;
  wallet?: Wallet;
}
```

---

## 🚀 Yeni Bir Rent a Car Sitesi İçin Checklist

### 1. Konfigürasyon
- [ ] `src/config/api.ts` - API_BASE_URL ve TENANT_ID güncelle
- [ ] Environment variables ayarla (.env)
- [ ] Default location ID'yi güncelle (SearchForm.tsx)

### 2. Branding & Content
- [ ] Logo dosyasını ekle (`public/berglogo22.png`)
- [ ] Favicon ekle
- [ ] Translation dosyalarını doldur (`src/locales/`)
- [ ] Company info sayfasını özelleştir
- [ ] Footer bilgilerini güncelle

### 3. Styling
- [ ] Primary color'ı değiştir (`src/index.css` - `--primary`)
- [ ] Logo URL'ini kontrol et
- [ ] Custom CSS varsa ekle

### 4. Features (Opsiyonel)
- [ ] Default currency ID'yi ayarla (tenant settings'den gelir)
- [ ] WhatsApp number'ı güncelle (FloatingContactButtons.tsx)
- [ ] Email templates özelleştir (utils/emailTemplate.ts)

### 5. SEO
- [ ] `index.html` meta tags güncelle
- [ ] Her sayfada SEO component'ini doldur
- [ ] Sitemap.xml oluştur (opsiyonel)
- [ ] robots.txt oluştur (opsiyonel)

### 6. Testing
- [ ] API bağlantısını test et
- [ ] Login/Register akışını test et
- [ ] Search ve reservation akışını test et
- [ ] Multi-language test et
- [ ] Mobile responsive test et

---

## 📚 Önemli Notlar

### API Response Normalization
- Bazı API response'ları nested `location` object'i içerebilir
- `SearchForm.tsx` ve `VehicleSearch.tsx`'te normalize edilir
- Normalize fonksiyonu: API response'u `PickupLocation` interface'ine çevirir

### localStorage Keys
```typescript
'token'                  // SaaS tenant token
'tenantSettings'         // Tenant ve settings object
'customerToken'          // Customer JWT token
'customerProfile'        // Customer profile object
'selectedLanguage'       // Selected language object
'selectedLanguageId'     // Selected language ID
'selectedCurrencyId'     // Selected currency ID
'searchLocationData'     // Last search location data
'pickupLocations'        // Cached pickup locations
'pickupLocationsTimestamp' // Cache timestamp
'languages'              // Cached languages list
'currencies'             // Cached currencies list
```

### Custom Events
```typescript
'currencyChanged'        // Currency değiştiğinde
'languageChanged'        // Language değiştiğinde
'searchLocationDataUpdated' // Search location data güncellendiğinde
```

### Performance Optimizations
- Location cache (1 gün)
- Code splitting (vendor chunks)
- Lazy loading (React.lazy kullanılabilir)
- Image optimization (lazy loading)

---

## 🔄 API Değişiklik Senaryosu

Eğer farklı bir API kullanılacaksa:

1. **API Base URL:** `src/config/api.ts` dosyasını güncelle
2. **Endpoint'ler:** `src/services/api.ts` ve `src/services/customerApi.ts` dosyalarını güncelle
3. **Response Format:** Type definitions'ı (`src/types/`) güncelle
4. **Authentication:** `src/hooks/useAuthInit.ts` ve `src/contexts/CustomerAuthContext.tsx` dosyalarını kontrol et
5. **Normalization:** API response normalization fonksiyonlarını güncelle

---

## 📖 Ek Kaynaklar

- **Vite Docs:** https://vitejs.dev/
- **React Router:** https://reactrouter.com/
- **Tailwind CSS:** https://tailwindcss.com/
- **shadcn/ui:** https://ui.shadcn.com/
- **Radix UI:** https://www.radix-ui.com/
- **date-fns:** https://date-fns.org/
- **React Query:** https://tanstack.com/query

---

## ✅ Sonuç

Bu proje, modern React/TypeScript teknolojileri kullanarak geliştirilmiş, production-ready bir araç kiralama web sitesidir. Multi-tenant SaaS yapısına uygun, ölçeklenebilir ve bakımı kolay bir mimariye sahiptir. Yeni bir rent a car sitesi oluşturmak için yukarıdaki checklist'i takip ederek hızlıca özelleştirilebilir.


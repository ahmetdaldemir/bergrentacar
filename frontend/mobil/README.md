# Berg Rent A Car - React Native Mobile App

Bu proje, Berg Rent A Car web uygulamasının React Native ile geliştirilmiş mobil versiyonudur.

## Özellikler

- ✅ React Native (Expo) ile geliştirilmiş
- ✅ React Navigation ile sayfa navigasyonu
- ✅ AsyncStorage ile veri saklama (localStorage yerine)
- ✅ Çoklu dil desteği (TR, EN, DE, RU)
- ✅ API entegrasyonu (Web uygulaması ile aynı API)
- ✅ TanStack Query ile veri yönetimi
- ✅ TypeScript desteği

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# iOS için çalıştır (macOS gerekli)
npm run ios

# Android için çalıştır
npm run android

# Web için çalıştır
npm run web
```

## Proje Yapısı

```
mobil/
├── src/
│   ├── components/      # Reusable bileşenler
│   ├── config/          # API yapılandırması
│   ├── contexts/         # React Context'ler
│   ├── hooks/            # Custom hooks
│   ├── locales/          # Çeviri dosyaları
│   ├── pages/             # Sayfa bileşenleri
│   ├── services/          # API servisleri
│   ├── types/             # TypeScript type tanımları
│   └── utils/             # Yardımcı fonksiyonlar
├── App.tsx               # Ana uygulama bileşeni
└── package.json
```

## API Yapılandırması

API base URL ve tenant ID yapılandırması `src/config/api.ts` dosyasında bulunmaktadır. Web uygulaması ile aynı API kullanılmaktadır:

- Production: `https://berg.saastour360.com/api`
- Tenant ID: `9930c947-f720-463c-ba1d-e1af921d5ffb`

## Çeviri Sistemi

Çeviri dosyaları `src/locales/` klasöründe bulunmaktadır:
- `tr.json` - Türkçe
- `en.json` - İngilizce
- `de.json` - Almanca
- `ru.json` - Rusça

Çeviri kullanımı:
```typescript
import { useTranslation } from '@/contexts/TranslationContext';

const { t } = useTranslation();
const title = t('hero.title');
```

## Navigasyon

React Navigation kullanılmaktadır. Tüm sayfalar `App.tsx` içinde tanımlanmıştır.

## Geliştirme Notları

- `localStorage` yerine `AsyncStorage` kullanılmaktadır
- Web uygulamasındaki tüm API endpoint'leri aynı şekilde kullanılmaktadır
- Bileşenler React Native bileşenleri (View, Text, ScrollView, vb.) kullanılarak oluşturulmuştur
- Styling için StyleSheet kullanılmaktadır

## Gelecek Geliştirmeler

- [ ] Detaylı sayfa implementasyonları
- [ ] Form validasyonları
- [ ] Görsel iyileştirmeler
- [ ] Push notification desteği
- [ ] Offline mode desteği


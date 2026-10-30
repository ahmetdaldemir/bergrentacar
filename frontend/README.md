# Berg Rent a Car

Berg Rent a Car web uygulaması. Antalya ve Alanya başta olmak üzere Türkiye'de araç kiralama ve transfer hizmetleri.

**Site**: https://www.bergrentacar.com

## Nasıl çalıştırılır?

Node.js ve npm gereklidir.

```sh
# Bağımlılıkları yükle
npm i

# Geliştirme sunucusunu başlat
npm run dev
```

## Kullanılan teknolojiler

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Google Maps API Configuration

The project uses Google Places API for transfer location search with autocomplete functionality.

### Setup

1. Get a Google Maps API Key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Places API" and "Maps JavaScript API"
   - Create an API key

2. Add your API key to `index.html`:
   - Open `index.html`
   - Find the line: `<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places&language=tr" defer></script>`
   - Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key

### Features

- ✅ Google Places Autocomplete for pickup and dropoff locations
- ✅ Search hotels, areas, and addresses in Turkey
- ✅ Transfer vehicle listing modal
- ✅ Multi-language support (Turkish, English, German, Russian)

## Locales Sync Script

Proje, API'den gelen yeni dilleri otomatik olarak algılayıp locales klasörüne yeni dil dosyaları oluşturan bir script içermektedir.

### Kullanım

```sh
npm run sync-locales
```

veya

```sh
node scripts/sync-locales.js
```

### Nasıl Çalışır?

1. **API'den Dilleri Çeker**: Script, `/api/languages` endpoint'inden aktif dilleri çeker
2. **Mevcut Dosyaları Kontrol Eder**: `src/locales/` klasöründeki mevcut dil dosyalarını listeler
3. **Yeni Dilleri Algılar**: API'den gelen diller arasında locales klasöründe olmayanları tespit eder
4. **Yeni Dosyalar Oluşturur**: Yeni diller için `tr.json` dosyasını baz alarak yeni dil dosyaları oluşturur
5. **Mevcut Dosyaları Günceller**: Mevcut dil dosyalarında eksik key'leri `tr.json`'dan ekler

### Özellikler

- ✅ Otomatik dil algılama
- ✅ Yeni dil dosyaları oluşturma
- ✅ Mevcut dosyaları güncelleme (deep merge)
- ✅ Eksik key'leri otomatik ekleme
- ✅ Güzel formatlanmış JSON çıktısı

### Örnek Kullanım Senaryosu

API'de yeni diller eklendiğinde (örneğin Danca "da" ve İsveççe "sv"):

```sh
npm run sync-locales
```

Çıktı:
```
🚀 Locales senkronizasyonu başlatılıyor...

🌐 API'den diller çekiliyor...
✅ 6 aktif dil bulundu
📂 Mevcut locale dosyaları: tr, en, de, ru

📖 Baz locale dosyası okunuyor: tr.json
✅ Baz locale yüklendi (45 ana key)

🆕 2 yeni dil bulundu:

   🌍 Dansk (da)
   ✅ da.json oluşturuldu
   🌍 Svenska (sv)
   ✅ sv.json oluşturuldu

✅ Locales senkronizasyonu tamamlandı!

💡 Not: Yeni oluşturulan dosyalarda çeviriler henüz yapılmamış olabilir.
   Lütfen çevirileri manuel olarak güncelleyin veya çeviri servisi kullanın.
```

### Notlar

- Yeni oluşturulan dil dosyaları `tr.json` dosyasındaki çevirileri içerir (Türkçe metinler)
- Çevirileri manuel olarak güncellemeniz veya çeviri servisi kullanmanız gerekebilir
- Script, mevcut çevirileri korur ve sadece eksik key'leri ekler (deep merge)
- API URL'i `VITE_API_BASE_URL` environment variable'ından alınabilir veya default değer kullanılır

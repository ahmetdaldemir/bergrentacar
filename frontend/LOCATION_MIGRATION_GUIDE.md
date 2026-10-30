# Location Modülü Migration Rehberi

## Özet

Mevcut `rentacar_locations` yapısını, genel bir `locations` tablosu ve SaaS mapping yapısına dönüştürme planı.

## Yeni Yapı

### Veritabanı Şeması

```
locations (Genel Havuz)
├── id
├── name
├── parent_id
└── type

rentacar_locations (SaaS Mapping)
├── id
├── location_id → locations.id (FK)
├── tenant_id
├── sort, address, price, etc. (SaaS'a özel alanlar)
└── is_active

drop_locations (Mevcut yapı korunur)
├── id
├── location_id → rentacar_locations.id (FK)
├── delivery_location_id → locations.id (FK)
└── ...
```

## Frontend Değişiklikleri

### ✅ Mevcut Kod Korunur

- `PickupLocation` interface'i aynı kalır
- `SearchForm` component'i değişmez
- Mevcut API endpoint'leri aynı response formatını döner

### ➕ Yeni API Endpoint'leri

SaaS admin paneli için yeni endpoint'ler eklendi:

```typescript
// Tüm lokasyonları getir (SaaS seçimi için)
api.getAllLocations()

// SaaS'a lokasyon ekle
api.addLocationToSaaS({
  locationId: 1,
  sort: 1,
  address: "İstanbul, Türkiye",
  isActive: true
})

// SaaS lokasyonunu güncelle
api.updateSaaSLocation(rentacarLocationId, {
  sort: 2,
  isActive: false
})

// SaaS'tan lokasyon kaldır
api.removeLocationFromSaaS(rentacarLocationId)
```

## Backend Implementation

### API Response Formatı (Değişmez)

Backend'den dönen response formatı mevcut yapıyla **tamamen uyumlu** olmalı:

```json
{
  "data": [
    {
      "id": 1,
      "name": "İstanbul Havalimanı",
      "title": "İstanbul Havalimanı",
      "type": "airport",
      "parentId": null,
      "isActive": true,
      "children": [...],
      "drops": [...]
    }
  ]
}
```

### Backend SQL Query

```sql
-- Tenant'a özel lokasyonları getir
SELECT 
    rl.id,
    l.name,
    l.name as title,
    l.type,
    l.parent_id as parentId,
    rl.tenant_id as tenantId,
    rl.sort,
    rl.address,
    rl.price,
    rl.is_active as isActive,
    ...
FROM rentacar_locations rl
INNER JOIN locations l ON rl.location_id = l.id
WHERE rl.tenant_id = ? 
  AND rl.is_active = TRUE
  AND l.parent_id IS NULL
ORDER BY rl.sort ASC;
```

## Migration Adımları

### 1. Veritabanı Migration

```sql
-- 1. locations tablosunu oluştur
CREATE TABLE locations (...);

-- 2. Mevcut rentacar_locations verilerini locations'a migrate et
INSERT INTO locations (id, name, parent_id, type)
SELECT DISTINCT id, name, parent_id, type 
FROM rentacar_locations;

-- 3. rentacar_locations tablosunu yeni yapıya göre güncelle
ALTER TABLE rentacar_locations 
ADD COLUMN location_id BIGINT,
ADD FOREIGN KEY (location_id) REFERENCES locations(id);

-- 4. Mevcut verileri map et
UPDATE rentacar_locations rl
SET location_id = rl.id; -- İlk migration için

-- 5. Eski kolonları kaldır (opsiyonel, backward compatibility için tutulabilir)
```

### 2. Backend API Güncelleme

- `GET /api/rentacar/locations` endpoint'ini JOIN query ile güncelle
- Response formatını koru
- Yeni endpoint'ler ekle:
  - `GET /api/locations/all` - Tüm lokasyonlar
  - `POST /api/rentacar/locations` - SaaS'a lokasyon ekle
  - `PUT /api/rentacar/locations/:id` - SaaS lokasyonunu güncelle
  - `DELETE /api/rentacar/locations/:id` - SaaS'tan lokasyon kaldır

### 3. Test

- ✅ Mevcut frontend testleri çalışmalı
- ✅ API response formatı aynı olmalı
- ✅ Parent-child ilişkileri korunmalı
- ✅ Drop locations çalışmalı

## Avantajlar

1. **Mevcut yapı korunur**: Frontend'de hiçbir breaking change yok
2. **Normalizasyon**: Lokasyonlar tek bir yerde yönetilir
3. **SaaS izolasyonu**: Her SaaS kendi lokasyon setini seçer
4. **Ölçeklenebilirlik**: Yeni lokasyonlar genel havuzdan seçilir
5. **Bakım kolaylığı**: Lokasyon güncellemeleri tek yerden yapılır

## Örnek Kullanım Senaryosu

### Senaryo: Yeni SaaS Lokasyon Ekleme

1. **Admin Panel**: SaaS admin, genel lokasyon havuzundan lokasyon seçer
   ```typescript
   const allLocations = await api.getAllLocations();
   // Kullanıcı "İstanbul Havalimanı" seçer
   ```

2. **Mapping Oluşturma**: Seçilen lokasyon SaaS'a eklenir
   ```typescript
   await api.addLocationToSaaS({
     locationId: 1, // İstanbul Havalimanı
     sort: 1,
     address: "İstanbul, Türkiye",
     isActive: true
   });
   ```

3. **Kullanım**: Frontend'de mevcut kod çalışmaya devam eder
   ```typescript
   const locations = await api.getPickupLocations();
   // Response formatı aynı, backend JOIN yapıyor
   ```

## Notlar

- ⚠️ Backend'de JOIN query'leri performanslı olmalı (index'ler önemli)
- ⚠️ Migration sırasında mevcut veriler korunmalı
- ⚠️ Backward compatibility için eski kolonlar bir süre tutulabilir
- ✅ Frontend'de hiçbir değişiklik gerekmez
- ✅ Mevcut API contract'ları korunur


# Location Modülü Mimari Önerisi

## Genel Bakış

Mevcut yapıyı bozmadan, genel bir `locations` tablosu ve SaaS'a özel `rentacar_locations` mapping tablosu ile çalışacak yapı.

## Veritabanı Yapısı

### 1. `locations` Tablosu (Genel Lokasyon Havuzu)

```sql
CREATE TABLE locations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    parent_id BIGINT NULL,
    type VARCHAR(50) NULL, -- 'airport', 'hotel', 'center', 'address', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_parent_id (parent_id),
    INDEX idx_type (type)
);
```

### 2. `rentacar_locations` Tablosu (SaaS Mapping + Ekstra Alanlar)

```sql
CREATE TABLE rentacar_locations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    location_id BIGINT NOT NULL, -- locations tablosuna referans
    tenant_id VARCHAR(255) NOT NULL, -- SaaS tenant ID
    sort INT DEFAULT 0,
    address TEXT NULL,
    status INT DEFAULT 1, -- 0: inactive, 1: active
    price DECIMAL(10,2) NULL,
    delivery_fee VARCHAR(50) NULL,
    drop_fee VARCHAR(50) NULL,
    min_day_count INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tenant_location (tenant_id, location_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_location_id (location_id),
    INDEX idx_is_active (is_active)
);
```

### 3. `drop_locations` Tablosu (Mevcut Yapı Korunur)

```sql
CREATE TABLE drop_locations (
    id VARCHAR(255) PRIMARY KEY,
    location_id BIGINT NOT NULL, -- rentacar_locations.id
    delivery_location_id BIGINT NOT NULL, -- locations.id (teslimat noktası)
    distance DECIMAL(10,2) NULL,
    fee DECIMAL(10,2) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (location_id) REFERENCES rentacar_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_location_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_location_id (location_id),
    INDEX idx_delivery_location_id (delivery_location_id)
);
```

## Veri Akışı

### Backend API Response Formatı

Backend'den dönen veri formatı mevcut yapıyla uyumlu olmalı:

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
      "sort": 1,
      "address": "İstanbul, Türkiye",
      "price": 0,
      "deliveryFee": "50",
      "dropFee": "50",
      "minDayCount": null,
      "tenantId": "tenant-123",
      "children": [
        {
          "id": 2,
          "name": "Terminal 1",
          "title": "Terminal 1",
          "type": "airport",
          "parentId": 1,
          "isActive": true
        }
      ],
      "drops": [
        {
          "id": "drop-1",
          "locationId": "1",
          "deliveryLocationId": "3",
          "deliveryLocationName": "Taksim Merkez",
          "distance": 25.5,
          "fee": 100,
          "isActive": true
        }
      ]
    }
  ]
}
```

### Backend SQL Query Örneği

```sql
-- Tenant'a özel lokasyonları getir (parent-child yapısıyla)
SELECT 
    rl.id,
    l.id as location_id,
    l.name,
    l.name as title,
    l.type,
    l.parent_id as parentId,
    rl.tenant_id as tenantId,
    rl.sort,
    rl.address,
    rl.status,
    rl.price,
    rl.delivery_fee as deliveryFee,
    rl.drop_fee as dropFee,
    rl.min_day_count as minDayCount,
    rl.is_active as isActive,
    rl.created_at as createdAt,
    rl.updated_at as updatedAt
FROM rentacar_locations rl
INNER JOIN locations l ON rl.location_id = l.id
WHERE rl.tenant_id = ? 
  AND rl.is_active = TRUE
  AND (l.parent_id IS NULL OR l.parent_id = 0) -- Sadece parent'ları getir
ORDER BY rl.sort ASC, l.name ASC;

-- Children'ları getir
SELECT 
    rl.id,
    l.id as location_id,
    l.name,
    l.name as title,
    l.type,
    l.parent_id as parentId,
    rl.tenant_id as tenantId,
    rl.is_active as isActive
FROM rentacar_locations rl
INNER JOIN locations l ON rl.location_id = l.id
WHERE rl.tenant_id = ? 
  AND l.parent_id = ? -- Parent ID'ye göre
  AND rl.is_active = TRUE
ORDER BY rl.sort ASC, l.name ASC;

-- Drop locations'ı getir
SELECT 
    dl.id,
    dl.location_id as locationId,
    dl.delivery_location_id as deliveryLocationId,
    l.name as deliveryLocationName,
    dl.distance,
    dl.fee,
    dl.is_active as isActive
FROM drop_locations dl
INNER JOIN locations l ON dl.delivery_location_id = l.id
WHERE dl.location_id = ? 
  AND dl.is_active = TRUE;
```

## Frontend Değişiklikleri

### Mevcut Interface'ler Korunur

Frontend'de hiçbir değişiklik yapılmayacak. `PickupLocation` interface'i aynı kalacak:

```typescript
export interface PickupLocation {
  id: number | string;
  name?: string;
  title?: string;
  type?: string;
  parentId?: number | string | null;
  isActive?: boolean;
  // ... diğer alanlar
}
```

### API Servisleri

Mevcut API endpoint'leri aynı kalacak, sadece backend'de JOIN yapılacak:

```typescript
// src/services/api.ts - Değişiklik yok
getPickupLocations: async () => {
  // Backend'den gelen response formatı aynı
  const response = await fetch(`${API_BASE_URL}/rentacar/locations?isActive=true&tenantId=${tenantId}`);
  return response.json();
}
```

## SaaS Lokasyon Seçimi Workflow'u

### 1. Admin Panel'de Lokasyon Seçimi

```typescript
// Yeni API endpoint: Tüm lokasyonları getir (SaaS seçimi için)
GET /api/locations/all
Response: {
  "data": [
    {
      "id": 1,
      "name": "İstanbul Havalimanı",
      "type": "airport",
      "parentId": null,
      "children": [...]
    }
  ]
}

// SaaS'a lokasyon ekleme
POST /api/rentacar/locations
Body: {
  "locationId": 1,
  "tenantId": "tenant-123",
  "sort": 1,
  "address": "İstanbul, Türkiye",
  "price": 0,
  "isActive": true
}
```

### 2. Mapping Mantığı

- SaaS bir lokasyon seçtiğinde → `rentacar_locations` tablosuna kayıt eklenir
- `location_id` → `locations` tablosuna referans
- `tenant_id` → SaaS'a özel
- Ekstra alanlar (sort, address, price, etc.) → `rentacar_locations` tablosunda

## Avantajlar

1. ✅ **Mevcut yapı korunur**: Frontend'de hiçbir değişiklik gerekmez
2. ✅ **Normalizasyon**: Lokasyonlar tek bir yerde yönetilir
3. ✅ **SaaS izolasyonu**: Her SaaS kendi lokasyon setini seçer
4. ✅ **Esneklik**: SaaS'a özel ekstra alanlar eklenebilir
5. ✅ **Performans**: JOIN ile tek sorguda tüm veri gelir
6. ✅ **Ölçeklenebilirlik**: Yeni lokasyonlar genel havuzdan seçilir

## Migration Stratejisi

### Adım 1: Yeni Tabloları Oluştur
```sql
-- locations tablosu
-- rentacar_locations tablosu (mevcut verileri migrate et)
```

### Adım 2: Mevcut Verileri Migrate Et
```sql
-- Mevcut rentacar_locations verilerini locations tablosuna taşı
-- Sonra rentacar_locations'ı yeni yapıya göre güncelle
```

### Adım 3: Backend API'yi Güncelle
- JOIN query'leri ekle
- Response formatını koru

### Adım 4: Test
- Frontend'de mevcut testler çalışmalı
- Yeni yapıyla uyumlu olmalı

## Örnek Backend Implementation (Node.js/Express)

```typescript
// Backend API endpoint
app.get('/api/rentacar/locations', async (req, res) => {
  const { tenantId, isActive } = req.query;
  
  // Parent lokasyonları getir
  const parents = await db.query(`
    SELECT 
      rl.id,
      l.id as location_id,
      l.name,
      l.name as title,
      l.type,
      l.parent_id as parentId,
      rl.tenant_id as tenantId,
      rl.sort,
      rl.address,
      rl.price,
      rl.delivery_fee as deliveryFee,
      rl.drop_fee as dropFee,
      rl.min_day_count as minDayCount,
      rl.is_active as isActive
    FROM rentacar_locations rl
    INNER JOIN locations l ON rl.location_id = l.id
    WHERE rl.tenant_id = ? 
      AND rl.is_active = ?
      AND l.parent_id IS NULL
    ORDER BY rl.sort ASC, l.name ASC
  `, [tenantId, isActive === 'true']);
  
  // Her parent için children'ları getir
  for (const parent of parents) {
    const children = await db.query(`
      SELECT 
        rl.id,
        l.id as location_id,
        l.name,
        l.name as title,
        l.type,
        l.parent_id as parentId,
        rl.is_active as isActive
      FROM rentacar_locations rl
      INNER JOIN locations l ON rl.location_id = l.id
      WHERE rl.tenant_id = ? 
        AND l.parent_id = ?
        AND rl.is_active = ?
      ORDER BY rl.sort ASC, l.name ASC
    `, [tenantId, parent.location_id, isActive === 'true']);
    
    parent.children = children;
    
    // Drop locations'ı getir
    const drops = await db.query(`
      SELECT 
        dl.id,
        dl.location_id as locationId,
        dl.delivery_location_id as deliveryLocationId,
        l.name as deliveryLocationName,
        dl.distance,
        dl.fee,
        dl.is_active as isActive
      FROM drop_locations dl
      INNER JOIN locations l ON dl.delivery_location_id = l.id
      WHERE dl.location_id = ? 
        AND dl.is_active = TRUE
    `, [parent.id]);
    
    parent.drops = drops;
  }
  
  res.json({ data: parents });
});
```

## Sonuç

Bu yapı ile:
- ✅ Mevcut frontend kodu değişmeden çalışır
- ✅ Lokasyonlar merkezi bir yerde yönetilir
- ✅ SaaS'lar kendi lokasyon setlerini seçer
- ✅ Ölçeklenebilir ve bakımı kolay bir yapı oluşur


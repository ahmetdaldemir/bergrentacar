#!/usr/bin/env node

/**
 * Locales Sync Script
 * 
 * Bu script, API'den gelen yeni dilleri algılar ve locales klasörüne
 * otomatik olarak yeni dil dosyaları oluşturur.
 * 
 * Kullanım:
 *   npm run sync-locales
 *   node scripts/sync-locales.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API Base URL - environment variable'dan veya default değer
const API_BASE_URL = 'https://bergrentacar.com/api';
const LOCALES_DIR = path.join(__dirname, '../src/locales');
const BASE_LOCALE = 'tr.json'; // Baz alınacak dil dosyası (tüm çeviriler buradan kopyalanacak)

/**
 * API'den dilleri çeker
 */
async function fetchLanguages() {
  try {
    console.log('🌐 API\'den diller çekiliyor...');
    const response = await fetch(`${API_BASE_URL}/languages`);
    
    if (!response.ok) {
      throw new Error(`API hatası: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Farklı response formatlarını handle et
    let languages = [];
    if (Array.isArray(data)) {
      languages = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
      languages = data.data;
    } else if (data && typeof data === 'object' && Array.isArray(data.languages)) {
      languages = data.languages;
    }
    
    // Sadece aktif dilleri filtrele
    const activeLanguages = languages.filter(lang => lang.isActive === true);
    
    console.log(`✅ ${activeLanguages.length} aktif dil bulundu`);
    return activeLanguages;
  } catch (error) {
    console.error('❌ API\'den diller çekilirken hata:', error.message);
    throw error;
  }
}

/**
 * Mevcut locales dosyalarını listeler
 */
function getExistingLocales() {
  try {
    if (!fs.existsSync(LOCALES_DIR)) {
      console.log(`📁 ${LOCALES_DIR} klasörü bulunamadı, oluşturuluyor...`);
      fs.mkdirSync(LOCALES_DIR, { recursive: true });
      return [];
    }
    
    const files = fs.readdirSync(LOCALES_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    const locales = jsonFiles.map(file => file.replace('.json', ''));
    
    console.log(`📂 Mevcut locale dosyaları: ${locales.join(', ')}`);
    return locales;
  } catch (error) {
    console.error('❌ Locales klasörü okunurken hata:', error.message);
    throw error;
  }
}

/**
 * Baz locale dosyasını okur (tüm çeviriler buradan kopyalanacak)
 */
function readBaseLocale() {
  const baseLocalePath = path.join(LOCALES_DIR, BASE_LOCALE);
  
  if (!fs.existsSync(baseLocalePath)) {
    console.warn(`⚠️  ${BASE_LOCALE} dosyası bulunamadı, en.json deneniyor...`);
    const enLocalePath = path.join(LOCALES_DIR, 'en.json');
    if (fs.existsSync(enLocalePath)) {
      return JSON.parse(fs.readFileSync(enLocalePath, 'utf8'));
    }
    throw new Error('Baz locale dosyası bulunamadı (tr.json veya en.json)');
  }
  
  return JSON.parse(fs.readFileSync(baseLocalePath, 'utf8'));
}

/**
 * Yeni locale dosyası oluşturur
 */
function createLocaleFile(localeCode, baseLocaleData) {
  const localePath = path.join(LOCALES_DIR, `${localeCode}.json`);
  
  // Eğer dosya zaten varsa, mevcut içeriği koru (sadece yeni key'ler ekle)
  let existingData = {};
  if (fs.existsSync(localePath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(localePath, 'utf8'));
      console.log(`   📝 Mevcut ${localeCode}.json dosyası bulundu, güncelleniyor...`);
    } catch (error) {
      console.warn(`   ⚠️  ${localeCode}.json okunamadı, yeni dosya oluşturuluyor...`);
    }
  }
  
  // Recursive merge: mevcut veriyi koru, eksik key'leri base'den ekle
  const mergedData = deepMerge(baseLocaleData, existingData);
  
  // Dosyayı yaz (güzel formatlanmış JSON)
  fs.writeFileSync(
    localePath,
    JSON.stringify(mergedData, null, 2) + '\n',
    'utf8'
  );
  
  console.log(`   ✅ ${localeCode}.json ${fs.existsSync(localePath) ? 'güncellendi' : 'oluşturuldu'}`);
}

/**
 * Deep merge iki objeyi birleştirir (mevcut veriyi korur, eksik key'leri ekler)
 */
function deepMerge(base, existing) {
  const result = { ...existing };
  
  for (const key in base) {
    if (base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      result[key] = deepMerge(base[key], existing[key] || {});
    } else if (!(key in existing)) {
      result[key] = base[key];
    }
  }
  
  return result;
}

/**
 * Ana fonksiyon
 */
async function main() {
  try {
    console.log('🚀 Locales senkronizasyonu başlatılıyor...\n');
    
    // 1. API'den dilleri çek
    const languages = await fetchLanguages();
    
    if (languages.length === 0) {
      console.warn('⚠️  Hiç aktif dil bulunamadı');
      return;
    }
    
    // 2. Mevcut locales dosyalarını listele
    const existingLocales = getExistingLocales();
    
    // 3. Baz locale dosyasını oku
    console.log(`\n📖 Baz locale dosyası okunuyor: ${BASE_LOCALE}`);
    const baseLocaleData = readBaseLocale();
    console.log(`✅ Baz locale yüklendi (${Object.keys(baseLocaleData).length} ana key)\n`);
    
    // 4. Yeni dilleri tespit et ve dosyaları oluştur
    const newLocales = languages.filter(lang => {
      const code = lang.code?.toLowerCase() || lang.id?.toLowerCase();
      return code && !existingLocales.includes(code);
    });
    
    const updatedLocales = languages.filter(lang => {
      const code = lang.code?.toLowerCase() || lang.id?.toLowerCase();
      return code && existingLocales.includes(code);
    });
    
    if (newLocales.length > 0) {
      console.log(`\n🆕 ${newLocales.length} yeni dil bulundu:\n`);
      for (const lang of newLocales) {
        const code = lang.code?.toLowerCase() || lang.id?.toLowerCase();
        console.log(`   🌍 ${lang.name} (${code})`);
        createLocaleFile(code, baseLocaleData);
      }
    } else {
      console.log('\n✨ Yeni dil bulunamadı');
    }
    
    if (updatedLocales.length > 0) {
      console.log(`\n🔄 ${updatedLocales.length} mevcut dil güncelleniyor:\n`);
      for (const lang of updatedLocales) {
        const code = lang.code?.toLowerCase() || lang.id?.toLowerCase();
        console.log(`   🌍 ${lang.name} (${code})`);
        createLocaleFile(code, baseLocaleData);
      }
    }
    
    console.log('\n✅ Locales senkronizasyonu tamamlandı!\n');
    console.log('💡 Not: Yeni oluşturulan dosyalarda çeviriler henüz yapılmamış olabilir.');
    console.log('   Lütfen çevirileri manuel olarak güncelleyin veya çeviri servisi kullanın.\n');
    
  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    process.exit(1);
  }
}

// Script'i çalıştır
main();


/**
 * Tüm aktif tenant'lara tour:true feature flag'i set eder.
 * Çalıştır: node scripts/enable-tour-features.js
 */
require('dotenv/config');
require('reflect-metadata');

const { AppDataSource } = require('../dist/config/data-source');

async function main() {
  AppDataSource.options.synchronize = false;
  await AppDataSource.initialize();
  console.log('DB bağlandı.\n');

  // Mevcut durum
  const before = await AppDataSource.query(
    `SELECT t.id, t.name, t.slug, t.category, t."isActive",
            (ts.metadata->'features'->>'tour')::boolean AS tour_feature
     FROM tenants t
     LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id AND ts.category = 'general'
     ORDER BY t.category, t.name`
  );
  console.log('=== MEVCUT TENANT DURUMU ===');
  before.forEach(r => console.log(`  [${r.category}] ${r.name} (${r.slug}) — isActive:${r.isActive} — tour:${r.tour_feature}`));

  // 1) Mevcut GENERAL satırı olan tenant'ları güncelle
  const updated = await AppDataSource.query(
    `UPDATE tenant_settings ts
     SET metadata = jsonb_set(COALESCE(ts.metadata, '{}'::jsonb), '{features,tour}', 'true'::jsonb, true),
         updated_at = now()
     FROM tenants t
     WHERE ts.tenant_id = t.id
       AND ts.category = 'general'
       AND t."isActive" = true
     RETURNING ts.tenant_id`
  );
  console.log(`\n✅ Güncellenen kayıt: ${updated.length}`);

  // 2) GENERAL satırı olmayan tenant'lar için yeni satır ekle
  const inserted = await AppDataSource.query(
    `INSERT INTO tenant_settings (id, created_at, updated_at, tenant_id, category, metadata)
     SELECT gen_random_uuid(), now(), now(), t.id, 'general', '{"features":{"tour":true}}'::jsonb
     FROM tenants t
     WHERE t."isActive" = true
       AND NOT EXISTS (
         SELECT 1 FROM tenant_settings ts WHERE ts.tenant_id = t.id AND ts.category = 'general'
       )
     RETURNING tenant_id`
  );
  console.log(`✅ Yeni eklenen kayıt: ${inserted.length}`);

  // Sonuç
  const after = await AppDataSource.query(
    `SELECT t.name, t.slug, t.category,
            (ts.metadata->'features'->>'tour')::boolean AS tour_feature
     FROM tenants t
     LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id AND ts.category = 'general'
     WHERE t."isActive" = true
     ORDER BY t.name`
  );
  console.log('\n=== GÜNCELLEME SONRASI ===');
  after.forEach(r => console.log(`  ${r.name} (${r.slug}) — tour:${r.tour_feature}`));

  await AppDataSource.destroy();
  console.log('\nTamamlandı.');
}

main().catch(e => {
  console.error('HATA:', e.message);
  process.exit(1);
});

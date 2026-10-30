import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TenantStaticTranslation } from '../entities/tenant-static-translation.entity';

export type StaticTranslationEntry = {
  key: string;
  namespace?: string | null;
  values: Record<string, string>;
};

export class TenantStaticTranslationService {
  private static repo(): Repository<TenantStaticTranslation> {
    return AppDataSource.getRepository(TenantStaticTranslation);
  }

  /** Tenant'ın tüm statik çeviri anahtarlarını döndürür */
  static async list(tenantId: string, namespace?: string): Promise<TenantStaticTranslation[]> {
    const qb = this.repo()
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .orderBy('t.namespace', 'ASC', 'NULLS LAST')
      .addOrderBy('t.translation_key', 'ASC');

    if (namespace) {
      qb.andWhere('t.namespace = :namespace', { namespace });
    }

    return qb.getMany();
  }

  /** Tek anahtar döndürür */
  static async findByKey(tenantId: string, key: string): Promise<TenantStaticTranslation | null> {
    return this.repo().findOne({ where: { tenantId, translationKey: key } });
  }

  /** Yeni anahtar oluşturur */
  static async create(
    tenantId: string,
    entry: StaticTranslationEntry,
  ): Promise<TenantStaticTranslation> {
    const existing = await this.findByKey(tenantId, entry.key);
    if (existing) {
      throw new Error(`"${entry.key}" anahtarı zaten mevcut.`);
    }

    const row = this.repo().create({
      tenantId,
      translationKey: entry.key,
      namespace: entry.namespace ?? null,
      values: entry.values ?? {},
    });
    return this.repo().save(row);
  }

  /** Mevcut anahtarın değerlerini günceller */
  static async update(
    tenantId: string,
    key: string,
    values: Record<string, string>,
    namespace?: string | null,
  ): Promise<TenantStaticTranslation> {
    const row = await this.findByKey(tenantId, key);
    if (!row) throw new Error(`"${key}" anahtarı bulunamadı.`);

    row.values = values;
    if (namespace !== undefined) row.namespace = namespace;
    return this.repo().save(row);
  }

  /** Anahtarı siler */
  static async deleteKey(tenantId: string, key: string): Promise<void> {
    const row = await this.findByKey(tenantId, key);
    if (!row) throw new Error(`"${key}" anahtarı bulunamadı.`);
    await this.repo().remove(row);
  }

  /**
   * Varsayılan dil JSON'ını içe aktarır.
   * Mevcut anahtarlar merge edilir; yoksa oluşturulur.
   * Sadece defaultLanguage değerleri set edilir, diğer diller dokunulmaz.
   */
  static async importJson(
    tenantId: string,
    defaultLanguage: string,
    json: Record<string, string>,
    namespace?: string | null,
  ): Promise<{ created: number; updated: number }> {
    const keys = Object.keys(json);
    let created = 0;
    let updated = 0;

    for (const key of keys) {
      const value = json[key];
      const existing = await this.findByKey(tenantId, key);

      if (existing) {
        existing.values = { ...existing.values, [defaultLanguage]: value };
        if (namespace !== undefined && namespace !== null) existing.namespace = namespace;
        await this.repo().save(existing);
        updated++;
      } else {
        const row = this.repo().create({
          tenantId,
          translationKey: key,
          namespace: namespace ?? null,
          values: { [defaultLanguage]: value },
        });
        await this.repo().save(row);
        created++;
      }
    }

    return { created, updated };
  }

  /**
   * Belirli bir dil için tüm çevirileri düz JSON olarak döndürür.
   * Web sitesi /locales/{code}.json olarak bu endpoint'i kullanabilir.
   */
  static async exportForLanguage(
    tenantId: string,
    languageCode: string,
    namespace?: string,
  ): Promise<Record<string, string>> {
    const rows = await this.list(tenantId, namespace);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.translationKey] = row.values[languageCode] ?? '';
    }
    return result;
  }

  /**
   * Bir dil kodu için toplu güncelleme (PUT all values for a language).
   * Sadece gönderilen dil değeri güncellenir, diğer diller korunur.
   */
  static async bulkUpdateLanguage(
    tenantId: string,
    languageCode: string,
    translations: Record<string, string>,
  ): Promise<{ updated: number }> {
    const rows = await this.list(tenantId);
    let updated = 0;

    for (const row of rows) {
      if (Object.prototype.hasOwnProperty.call(translations, row.translationKey)) {
        row.values = {
          ...row.values,
          [languageCode]: translations[row.translationKey] ?? '',
        };
        await this.repo().save(row);
        updated++;
      }
    }

    return { updated };
  }
}

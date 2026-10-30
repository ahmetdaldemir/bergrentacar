import { TenantLanguageService } from '../../tenants/services/tenant-language.service';

/**
 * Translation Validator Utility
 * 
 * İçerik oluştururken tenant'ın aktif dillerini kontrol eder
 */
export class TranslationValidator {
  /**
   * Validate that all provided language IDs are active for the tenant
   * @throws Error if any language is not active
   */
  static async validateActiveLanguages(
    tenantId: string,
    languageIds: string[]
  ): Promise<void> {
    if (!languageIds || languageIds.length === 0) {
      throw new Error('En az bir dil gereklidir');
    }

    // Get active language IDs for tenant
    const activeLanguageIds = await TenantLanguageService.getActiveLanguageIds(tenantId);

    if (activeLanguageIds.length === 0) {
      throw new Error('Firma için aktif dil bulunamadı. Lütfen önce dilleri aktif edin.');
    }

    // Check if all provided languages are active
    const invalidLanguageIds = languageIds.filter(
      (id) => !activeLanguageIds.includes(id)
    );

    if (invalidLanguageIds.length > 0) {
      throw new Error(
        `Aşağıdaki diller firma için aktif değil: ${invalidLanguageIds.join(', ')}. Lütfen önce dilleri aktif edin.`
      );
    }
  }

  /**
   * Get active language IDs for a tenant (helper method)
   */
  static async getActiveLanguageIds(tenantId: string): Promise<string[]> {
    return TenantLanguageService.getActiveLanguageIds(tenantId);
  }

  /**
   * Check if a language is active for a tenant
   */
  static async isLanguageActive(tenantId: string, languageId: string): Promise<boolean> {
    return TenantLanguageService.isLanguageActive(tenantId, languageId);
  }

  /**
   * Filter language IDs to only include active ones
   */
  static async filterActiveLanguages(
    tenantId: string,
    languageIds: string[]
  ): Promise<string[]> {
    const activeLanguageIds = await TenantLanguageService.getActiveLanguageIds(tenantId);
    return languageIds.filter((id) => activeLanguageIds.includes(id));
  }
}

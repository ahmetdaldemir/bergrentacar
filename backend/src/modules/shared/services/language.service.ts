import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Language } from '../entities/language.entity';

export type CreateLanguageDto = {
  code: string;
  name: string;
  isActive?: boolean;
  isDefault?: boolean;
};

export type UpdateLanguageDto = Partial<CreateLanguageDto>;

export class LanguageService {
  private static repo(): Repository<Language> {
    return AppDataSource.getRepository(Language);
  }

  static list(): Promise<Language[]> {
    return this.repo().find({ order: { isDefault: 'DESC', name: 'ASC' } });
  }

  static async getDefault(): Promise<Language | null> {
    return this.repo().findOne({ where: { isDefault: true } });
  }

  static async getByCode(code: string): Promise<Language | null> {
    return this.repo().findOne({ where: { code, isActive: true } });
  }

  static async create(input: CreateLanguageDto): Promise<Language> {
    const existing = await this.repo().findOne({ where: { code: input.code } });
    if (existing) {
      throw new Error('Language code already exists');
    }

    // If setting as default, unset other defaults
    if (input.isDefault) {
      await this.repo().update({ isDefault: true }, { isDefault: false });
    }

    const language = this.repo().create({
      code: input.code,
      name: input.name,
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
    });

    return this.repo().save(language);
  }

  static async update(id: string, input: UpdateLanguageDto): Promise<Language> {
    const language = await this.repo().findOne({ where: { id } });
    if (!language) {
      throw new Error('Language not found');
    }

    if (input.code && input.code !== language.code) {
      const exists = await this.repo().findOne({ where: { code: input.code } });
      if (exists) {
        throw new Error('Language code already exists');
      }
      language.code = input.code;
    }

    if (typeof input.name === 'string') {
      language.name = input.name;
    }

    if (typeof input.isActive === 'boolean') {
      language.isActive = input.isActive;
    }

    // Handle default language change
    if (typeof input.isDefault === 'boolean') {
      if (input.isDefault && !language.isDefault) {
        // Setting this language as default: unset all other defaults
        await this.repo().update({ isDefault: true }, { isDefault: false });
        language.isDefault = true;
      } else if (!input.isDefault && language.isDefault) {
        // Unsetting default: just set to false
        language.isDefault = false;
      }
    }

    return this.repo().save(language);
  }

  static async setDefault(id: string): Promise<Language> {
    const language = await this.repo().findOne({ where: { id } });
    if (!language) {
      throw new Error('Language not found');
    }

    // Unset all other defaults
    await this.repo().update({ isDefault: true }, { isDefault: false });

    // Set this language as default
    language.isDefault = true;
    return this.repo().save(language);
  }

  static async remove(id: string): Promise<void> {
    const language = await this.repo().findOne({ where: { id } });
    if (!language) {
      throw new Error('Language not found');
    }
    await this.repo().remove(language);
  }
}

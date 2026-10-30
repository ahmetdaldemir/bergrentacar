import { Request, Response } from 'express';
import { LanguageService } from '../services/language.service';
import { asyncHandler, sendSuccess, ValidationError } from '../../../utils/errors';

export class LanguageController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;

    if (tenantId) {
      const { TenantLanguageService } = await import('../../tenants/services/tenant-language.service');
      try {
        const activeLanguageIds = await TenantLanguageService.getActiveLanguageIds(tenantId);
        if (activeLanguageIds.length === 0) {
          sendSuccess(res, []);
          return;
        }
        const allLanguages = await LanguageService.list();
        // Tenant bu dilleri seçtiyse listele; global languages.isActive kapalı olsa bile (panel uyumsuzluğu)
        const tenantActiveLanguages = allLanguages.filter((lang) => activeLanguageIds.includes(lang.id));
        sendSuccess(res, tenantActiveLanguages);
        return;
      } catch (error) {
        console.error('Failed to load tenant languages, falling back to all languages:', error);
        const languages = await LanguageService.list();
        sendSuccess(res, languages.filter(l => l.isActive));
        return;
      }
    }

    const languages = await LanguageService.list();
    sendSuccess(res, languages.filter(l => l.isActive));
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const { code, name, isActive, isDefault } = req.body;
    if (!code || !name) throw new ValidationError('code and name are required');
    const language = await LanguageService.create({ code, name, isActive, isDefault });
    sendSuccess(res, language, 201);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { code, name, isActive, isDefault } = req.body;
    const language = await LanguageService.update(id, { code, name, isActive, isDefault });
    sendSuccess(res, language);
  });

  static setDefault = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const language = await LanguageService.setDefault(id);
    sendSuccess(res, language);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await LanguageService.remove(id);
    res.status(204).send();
  });
}

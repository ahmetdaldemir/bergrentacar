import { Response } from 'express';
import { CountryService, CreateCountryInput, UpdateCountryInput } from '../services/country.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError } from '../../../utils/errors';

export class CountryController {
  static list = asyncHandler(async (req: AuthenticatedRequest | any, res: Response) => {
    const { activeOnly, languageId, tenantId } = req.query;
    const countries = activeOnly === 'true'
      ? await CountryService.listActive(languageId as string | undefined, tenantId as string | undefined)
      : await CountryService.list(languageId as string | undefined, tenantId as string | undefined);
    sendSuccess(res, countries);
  });

  static listForSite = asyncHandler(async (req: AuthenticatedRequest | any, res: Response) => {
    const { languageId, tenantId } = req.query;
    const countries = await CountryService.listForSite(languageId as string | undefined, tenantId as string | undefined);
    sendSuccess(res, countries);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest | any, res: Response) => {
    const { id } = req.params;
    const { languageId, tenantId } = req.query;
    const country = await CountryService.getById(id, languageId as string | undefined, tenantId as string | undefined);
    if (!country) throw new NotFoundError('Country', id);
    sendSuccess(res, country);
  });

  static getByCode = asyncHandler(async (req: AuthenticatedRequest | any, res: Response) => {
    const { code } = req.params;
    const { languageId, tenantId } = req.query;
    const country = await CountryService.getByCode(code, languageId as string | undefined, tenantId as string | undefined);
    if (!country) throw new NotFoundError('Country', code);
    sendSuccess(res, country);
  });

  static getBySlug = asyncHandler(async (req: AuthenticatedRequest | any, res: Response) => {
    const { slug } = req.params;
    const { languageId, tenantId } = req.query;
    if (!languageId) throw new ValidationError('languageId is required');
    const country = await CountryService.getBySlug(slug, languageId as string, tenantId as string | undefined);
    if (!country) throw new NotFoundError('Country', slug);
    sendSuccess(res, country);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const input = req.body as CreateCountryInput;
    if (!input.name || !input.code || !input.phoneCode) {
      throw new ValidationError('name, code, and phoneCode are required');
    }
    const country = await CountryService.create(input);
    sendSuccess(res, country, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const input = req.body as UpdateCountryInput;
    const country = await CountryService.update(id, input);
    sendSuccess(res, country);
  });

  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await CountryService.delete(id);
    sendSuccess(res, { message: 'Country deleted successfully' });
  });

  static toggleActive = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const country = await CountryService.toggleActive(id);
    sendSuccess(res, country);
  });

  static sync = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await CountryService.syncCountries();
    sendSuccess(res, {
      message: 'Countries synced successfully',
      created: result.created,
      updated: result.updated,
      total: result.total,
      translationsUpdated: result.translationsUpdated,
    });
  });
}

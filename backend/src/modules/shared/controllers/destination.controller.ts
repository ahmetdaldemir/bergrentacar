import { Request, Response } from 'express';
import { DestinationService } from '../services/destination.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { DestinationImportService } from '../services/destination-import.service';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { AiContentService } from '../services/ai-content.service';
import {
  asyncHandler,
  sendSuccess,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '../../../utils/errors';

export class DestinationController {
  static list = asyncHandler(async (req: Request & TenantRequest, res: Response) => {
    const tenantId = (req.query.tenantId as string | undefined) || (req as any).tenant?.id;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const languageId = req.query.languageId as string | undefined;
    const destinations = await DestinationService.list(tenantId, languageId);
    sendSuccess(res, destinations);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const languageId = req.query.languageId as string | undefined;
    const destination = await DestinationService.getById(id, languageId);
    if (!destination) throw new NotFoundError('Destination', id);
    sendSuccess(res, destination);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { image, isFeatured, isActive, rentacarLocationId, translations } = req.body;
    console.log(`[Destination Controller] Creating destination, image: ${image ? 'provided' : 'not provided'}, image value: ${image || 'null'}`);
    
    if (!translations || !Array.isArray(translations) || translations.length === 0) {
      throw new ValidationError('At least one translation is required');
    }
    for (const translation of translations) {
      if (!translation.languageId || !translation.title) {
        throw new ValidationError('Each translation must have languageId and title');
      }
    }

    const destination = await DestinationService.create({
      tenantId,
      image: image && image.trim() ? image.trim() : undefined,
      isFeatured,
      isActive,
      rentacarLocationId,
      translations,
    });
    console.log(`[Destination Controller] Destination created with ID: ${destination.id}, image: ${(destination as any).image || 'null'}`);
    sendSuccess(res, destination, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { image, isFeatured, isActive, rentacarLocationId, translations } = req.body;

    if (translations !== undefined) {
      if (!Array.isArray(translations)) throw new ValidationError('Translations must be an array');
      for (const translation of translations) {
        if (!translation.languageId || !translation.title) {
          throw new ValidationError('Each translation must have languageId and title');
        }
      }
    }

    const destination = await DestinationService.update(id, {
      image,
      isFeatured,
      isActive,
      rentacarLocationId,
      translations,
    });
    sendSuccess(res, destination);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await DestinationService.remove(id);
    res.status(204).send();
  });

  static importFromApi = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new ValidationError('Tenant is required');

    const { city, radius, limit } = req.body;
    if (!city) throw new ValidationError('city is required');

    const result = await DestinationImportService.importGlobal({ tenantId, city, radius, limit });
    sendSuccess(res, result, 201);
  });

  static generateContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title } = req.body;
    const languageCode = req.body.languageCode as string | undefined;
    if (!title || !title.trim()) throw new ValidationError('title is required');

    const auth = req.auth;
    const isAdmin = auth && 'type' in auth && auth.type === 'admin';
    const bodyTenantId = req.body.tenantId as string | undefined;
    const tenantId = isAdmin
      ? bodyTenantId
      : auth && 'tenantId' in auth
        ? auth.tenantId
        : bodyTenantId;

    if (!tenantId) throw new ValidationError('tenantId is required');

    if (!isAdmin && auth && 'tenantId' in auth) {
      const authTenantId = auth.tenantId;
      if (authTenantId && authTenantId !== tenantId) {
        throw new ForbiddenError('Not allowed to access this tenant');
      }
    }

    try {
      const result = await AiContentService.generateDestinationContent(
        { title: title.trim() },
        tenantId,
        languageCode
      );
      sendSuccess(res, result);
    } catch (error) {
      console.error('[Destination Controller] Error generating content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate content';
      throw new Error(errorMessage);
    }
  });
}

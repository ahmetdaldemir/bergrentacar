import { Request, Response } from 'express';
import { TourFeatureService } from '../services/tour-feature.service';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError } from '../../../utils/errors';

export class TourFeatureController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const languageCode = req.query.languageCode as string | undefined;
    const features = await TourFeatureService.list(languageCode);
    sendSuccess(res, features);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const feature = await TourFeatureService.getById(id);
    if (!feature) throw new NotFoundError('Tour feature', id);
    sendSuccess(res, feature);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const { icon, translations, sortOrder, isActive } = req.body;
    if (!icon || !translations || !Array.isArray(translations) || translations.length === 0) {
      throw new ValidationError('icon and translations array are required');
    }
    const feature = await TourFeatureService.create({ icon, translations, sortOrder, isActive });
    sendSuccess(res, feature, 201);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { icon, translations, sortOrder, isActive } = req.body;
    const feature = await TourFeatureService.update(id, { icon, translations, sortOrder, isActive });
    sendSuccess(res, feature);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await TourFeatureService.remove(id);
    res.status(204).send();
  });
}


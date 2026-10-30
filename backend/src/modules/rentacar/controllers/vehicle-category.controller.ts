import { Request, Response } from 'express';
import { VehicleCategoryService } from '../services/vehicle-category.service';
import { asyncHandler, sendSuccess, NotFoundError } from '../../../utils/errors';

export class VehicleCategoryController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const languageId = req.query.languageId as string | undefined;
    const categories = await VehicleCategoryService.list(languageId);
    sendSuccess(res, categories);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const category = await VehicleCategoryService.create(req.body);
    sendSuccess(res, category, 201);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await VehicleCategoryService.getById(id);
    if (!category) throw new NotFoundError('Vehicle category', id);
    sendSuccess(res, category);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await VehicleCategoryService.update(id, req.body);
    sendSuccess(res, category);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await VehicleCategoryService.remove(id);
    res.status(204).send();
  });
}

import { Request, Response } from 'express';
import { VehicleModelService } from '../services/vehicle-model.service';
import { asyncHandler, sendSuccess, NotFoundError } from '../../../utils/errors';

export class VehicleModelController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const brandId = req.query.brandId as string | undefined;
    const models = await VehicleModelService.list(brandId);
    sendSuccess(res, models);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const model = await VehicleModelService.create(req.body);
    sendSuccess(res, model, 201);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const model = await VehicleModelService.getById(id);
    if (!model) throw new NotFoundError('Vehicle model', id);
    sendSuccess(res, model);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const model = await VehicleModelService.update(id, req.body);
    sendSuccess(res, model);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await VehicleModelService.remove(id);
    res.status(204).send();
  });
}

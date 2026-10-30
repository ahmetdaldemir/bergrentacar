import { Request, Response } from 'express';
import { VehicleBrandService } from '../services/vehicle-brand.service';
import { asyncHandler, sendSuccess, NotFoundError } from '../../../utils/errors';

export class VehicleBrandController {
  static list = asyncHandler(async (_req: Request, res: Response) => {
    const brands = await VehicleBrandService.list();
    sendSuccess(res, brands);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const brand = await VehicleBrandService.create(req.body);
    sendSuccess(res, brand, 201);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const brand = await VehicleBrandService.getById(id);
    if (!brand) throw new NotFoundError('Vehicle brand', id);
    sendSuccess(res, brand);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const brand = await VehicleBrandService.update(id, req.body);
    sendSuccess(res, brand);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await VehicleBrandService.remove(id);
    res.status(204).send();
  });
}

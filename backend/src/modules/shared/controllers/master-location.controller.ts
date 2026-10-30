import { Request, Response } from 'express';
import { MasterLocationService } from '../services/master-location.service';
import { asyncHandler, sendSuccess, NotFoundError } from '../../../utils/errors';

export class MasterLocationController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const parentId = req.query.parentId as string | undefined;
    const locations = await MasterLocationService.list(parentId);
    sendSuccess(res, locations);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const location = await MasterLocationService.getById(id);
    if (!location) throw new NotFoundError('Location', id);
    sendSuccess(res, location);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const location = await MasterLocationService.create(req.body);
    sendSuccess(res, location, 201);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const location = await MasterLocationService.update(id, req.body);
    sendSuccess(res, location);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await MasterLocationService.remove(id);
    res.status(204).send();
  });
}


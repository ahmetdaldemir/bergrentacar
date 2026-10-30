import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { HotelService } from '../services/hotel.service';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError } from '../../../utils/errors';

export class HotelController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const hotels = await HotelService.list();
    sendSuccess(res, hotels);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const { name, starRating, address, city, country, destinationId, description, locationUrl } = req.body;
    if (!name || !address || !city || !country || !destinationId) {
      throw new ValidationError('name, address, city, country and destinationId are required');
    }
    const hotel = await HotelService.create({
      name, starRating, address, city, country, destinationId, description, locationUrl,
    });
    sendSuccess(res, hotel, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const { id } = req.params;
    const { name, starRating, address, city, country, destinationId, description, locationUrl } = req.body;
    const hotel = await HotelService.update(id, {
      name, starRating, address, city, country, destinationId, description, locationUrl,
    });
    sendSuccess(res, hotel);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const { id } = req.params;
    await HotelService.remove(id);
    res.status(204).send();
  });
}

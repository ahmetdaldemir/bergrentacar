import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { HotelContractService } from '../services/hotel-contract.service';
import { asyncHandler, sendSuccess } from '../../../utils/errors';
import { getTenantIdFromAuth } from '../../../utils/validation';

export class HotelContractController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const hotelId = req.query.hotelId as string | undefined;
    const contracts = await HotelContractService.list(tenantId, hotelId);
    sendSuccess(res, contracts);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const contract = await HotelContractService.getById(req.params.id, tenantId);
    sendSuccess(res, contract);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const contract = await HotelContractService.create({ ...req.body, tenantId });
    sendSuccess(res, contract, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const contract = await HotelContractService.update(req.params.id, tenantId, req.body);
    sendSuccess(res, contract);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    await HotelContractService.remove(req.params.id, tenantId);
    res.status(204).send();
  });

  static getAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const { checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) {
      return sendSuccess(res, { error: 'checkIn and checkOut query params are required' });
    }
    const availability = await HotelContractService.getAvailability(
      req.params.id,
      tenantId,
      new Date(checkIn as string),
      new Date(checkOut as string),
    );
    sendSuccess(res, availability);
  });

  static findAvailable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const { hotelId, roomTypeId, checkIn, checkOut } = req.query;
    if (!hotelId || !roomTypeId || !checkIn || !checkOut) {
      return sendSuccess(res, []);
    }
    const results = await HotelContractService.findCoveringContracts(
      tenantId,
      hotelId as string,
      roomTypeId as string,
      new Date(checkIn as string),
      new Date(checkOut as string),
    );
    sendSuccess(res, results);
  });
}

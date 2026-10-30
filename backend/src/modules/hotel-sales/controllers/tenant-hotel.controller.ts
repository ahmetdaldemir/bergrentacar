import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantHotelService } from '../services/tenant-hotel.service';
import { asyncHandler, sendSuccess, UnauthorizedError } from '../../../utils/errors';
import { getTenantIdFromAuth } from '../../../utils/validation';

export class TenantHotelController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const hotels = await TenantHotelService.list(tenantId);
    sendSuccess(res, hotels);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const hotel = await TenantHotelService.getById(req.params.id, tenantId);
    sendSuccess(res, hotel);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const hotel = await TenantHotelService.create({ ...req.body, tenantId });
    sendSuccess(res, hotel, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const hotel = await TenantHotelService.update(req.params.id, tenantId, req.body);
    sendSuccess(res, hotel);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    await TenantHotelService.remove(req.params.id, tenantId);
    res.status(204).send();
  });

  // ── Room Types ─────────────────────────────────────────────────────────────

  static listRoomTypes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const roomTypes = await TenantHotelService.listRoomTypes(req.params.hotelId, tenantId);
    sendSuccess(res, roomTypes);
  });

  static createRoomType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const roomType = await TenantHotelService.createRoomType({ ...req.body, hotelId: req.params.hotelId }, tenantId);
    sendSuccess(res, roomType, 201);
  });

  static updateRoomType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const roomType = await TenantHotelService.updateRoomType(req.params.roomTypeId, req.params.hotelId, tenantId, req.body);
    sendSuccess(res, roomType);
  });

  static removeRoomType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    await TenantHotelService.removeRoomType(req.params.roomTypeId, req.params.hotelId, tenantId);
    res.status(204).send();
  });
}

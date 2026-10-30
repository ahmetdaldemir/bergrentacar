import { Request, Response } from 'express';
import { PolygonPricingService } from '../services/polygon-pricing.service';
import { CreateZoneDto } from '../dto/create-zone.dto';
import { UpdateZoneDto } from '../dto/update-zone.dto';
import { QuoteRequestDto } from '../dto/quote-request.dto';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError } from '../../../utils/errors';

const service = new PolygonPricingService();

export const PolygonPricingController = {
  listZones: asyncHandler((req: Request, res: Response) => {
    const tenant_id = String(req.query.tenant_id || req.body.tenant_id || '');
    if (!tenant_id) throw new ValidationError('tenant_id required');
    const zones = service.listZones(tenant_id);
    sendSuccess(res, zones);
  }),

  getZone: asyncHandler((req: Request, res: Response) => {
    const id = String(req.params.id);
    const zone = service.getZoneById(id);
    if (!zone) throw new NotFoundError('Zone', id);
    sendSuccess(res, zone);
  }),

  createZone: asyncHandler((req: Request, res: Response) => {
    const body = req.body as CreateZoneDto;
    if (!body || !body.tenant_id || !body.name || !body.polygon_json) throw new ValidationError('invalid payload');
    const created = service.createZone(body);
    sendSuccess(res, created, 201);
  }),

  updateZone: asyncHandler((req: Request, res: Response) => {
    const id = String(req.params.id);
    const tenant_id = String(req.body.tenant_id || '');
    const dto: UpdateZoneDto = req.body;
    if (!tenant_id) throw new ValidationError('tenant_id required');
    const updated = service.updateZone(id, tenant_id, dto);
    if (!updated) throw new NotFoundError('Zone', id);
    sendSuccess(res, updated);
  }),

  deleteZone: asyncHandler((req: Request, res: Response) => {
    const id = String(req.params.id);
    const tenant_id = String(req.query.tenant_id || req.body.tenant_id || '');
    if (!tenant_id) throw new ValidationError('tenant_id required');
    const ok = service.deleteZone(id, tenant_id);
    if (!ok) throw new NotFoundError('Zone', id);
    res.status(204).send();
  }),

  listPrices: asyncHandler((req: Request, res: Response) => {
    const tenant_id = String(req.query.tenant_id || req.body.tenant_id || '');
    if (!tenant_id) throw new ValidationError('tenant_id required');
    const prices = service.listPrices(tenant_id);
    sendSuccess(res, prices);
  }),

  setPrice: asyncHandler((req: Request, res: Response) => {
    const payload = req.body;
    if (!payload || !payload.tenant_id || !payload.from_zone_id || !payload.to_zone_id || !payload.vehicle_type_id || payload.price === undefined) {
      throw new ValidationError('invalid payload');
    }
    const rec = service.setPrice(payload);
    sendSuccess(res, rec, 201);
  }),

  quote: asyncHandler((req: Request, res: Response) => {
    const body = req.body as QuoteRequestDto;
    if (!body || !body.tenant_id || body.pickup_lat === undefined || body.pickup_lng === undefined || body.drop_lat === undefined || body.drop_lng === undefined || !body.vehicle_type_id) {
      throw new ValidationError('invalid payload');
    }
    const result = service.getPriceForRoute(body);
    sendSuccess(res, result);
  }),

  _serviceInstance: service,
};



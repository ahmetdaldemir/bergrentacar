import { Request, Response } from 'express';
import { TransferZoneService } from '../services/transfer-zone.service';
import { TransferVehicleService } from '../services/transfer-vehicle.service';
import { TransferVehicle } from '../entities/transfer-vehicle.entity';
import { AppDataSource } from '../../../config/data-source';
import { TransferZonePrice } from '../entities/transfer-zone-price.entity';
import { TransferZonePriceGroup } from '../entities/transfer-zone-price-group.entity';
import { TransferZonePriceItem } from '../entities/transfer-zone-price-item.entity';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, ForbiddenError } from '../../../utils/errors';
import { TenantFeaturesService } from '../../shared/services/tenant-features.service';

const service = new TransferZoneService();

export const TransferZoneController = {
  listZones: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const zones = await service.listZones(tenantId);
    sendSuccess(res, zones);
  }),

  getZone: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    const { id } = req.params;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const zone = await service.getZoneById(id, tenantId);
    if (!zone) throw new NotFoundError('Zone', id);
    sendSuccess(res, zone);
  }),

  createZone: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    const { name, description, polygonJson, color } = req.body;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    if (!name || !polygonJson) throw new ValidationError('Name and polygonJson are required');
    const zone = await service.createZone({ tenantId, name, description, polygonJson, color });
    sendSuccess(res, zone, 201);
  }),

  updateZone: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    const { id } = req.params;
    const { name, description, polygonJson, color, isActive } = req.body;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const zone = await service.updateZone(id, tenantId, { name, description, polygonJson, color, isActive });
    if (!zone) throw new NotFoundError('Zone', id);
    sendSuccess(res, zone);
  }),

  deleteZone: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    const { id } = req.params;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const success = await service.deleteZone(id, tenantId);
    if (!success) throw new NotFoundError('Zone', id);
    sendSuccess(res, { message: 'Zone deleted successfully' });
  }),

  listPrices: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req.query && (req.query.tenantId as string)) || (req as any).tenant?.id;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const prices = await service.listPrices(tenantId);
    sendSuccess(res, prices);
  }),

  setPrice: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    const { fromZoneId, toZoneId, vehicleId, price, currencyCode, priceType, vehiclePrices } = req.body;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    if (!fromZoneId || !toZoneId) throw new ValidationError('fromZoneId and toZoneId are required');
    if (!vehiclePrices || !Array.isArray(vehiclePrices) || vehiclePrices.length === 0) {
      if (price === undefined) throw new ValidationError('fromZoneId, toZoneId, and price are required');
    }
    if (vehiclePrices && Array.isArray(vehiclePrices) && vehiclePrices.length > 0) {
      const created = await service.setPricesBulk({
        tenantId,
        fromZoneId,
        toZoneId,
        priceType: priceType === 'internal' ? 'internal' : 'between',
        vehiclePrices: vehiclePrices.map((vp: any) => ({
          vehicleId: vp.vehicleId,
          price: Number(vp.price),
          currencyCode: vp.currencyCode || currencyCode || 'EUR',
        })),
      });
      sendSuccess(res, created, 201);
      return;
    }
    const priceRecord = await service.setPrice({
      tenantId,
      fromZoneId,
      toZoneId,
      vehicleId,
      priceType: priceType === 'internal' ? 'internal' : 'between',
      price: Number(price),
      currencyCode,
    });
    sendSuccess(res, priceRecord, 201);
  }),

  updatePrice: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    const { id } = req.params;
    const { fromZoneId, toZoneId, vehicleId, price, currencyCode, isActive, priceType, items } = req.body;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    if (items && Array.isArray(items)) {
      const updatedGroup = await service.updateGroupWithItems(id, tenantId, {
        fromZoneId,
        toZoneId,
        priceType: priceType === 'internal' ? 'internal' : priceType === 'between' ? 'between' : undefined,
        isActive,
        items,
      });
      if (!updatedGroup) throw new NotFoundError('Price group', id);
      sendSuccess(res, updatedGroup);
      return;
    }
    const updated = await service.updatePriceById(id, tenantId, {
      fromZoneId,
      toZoneId,
      vehicleId,
      priceType: priceType === 'internal' ? 'internal' : priceType === 'between' ? 'between' : undefined,
      price: price !== undefined ? Number(price) : undefined,
      currencyCode,
      isActive,
    });
    if (!updated) throw new NotFoundError('Price', id);
    sendSuccess(res, updated);
  }),

  deletePrice: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id;
    const { id } = req.params;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    const success = await service.deletePrice(id, tenantId);
    if (!success) throw new NotFoundError('Price', id);
    sendSuccess(res, { message: 'Price deleted successfully' });
  }),

  quote: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req.body && req.body.tenantId) || (req as any).tenant?.id;
    const {
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      vehicleId,
      language,
      passengerCount: rawPassengerCount,
      /** VIP (vip+premium+luxury) veya Shuttle — web’de hat ile uyumlu; verilmezse tüm araçlar (geriye dönük) */
      productLine,
    } = req.body;
    if (!tenantId) throw new ValidationError('Tenant ID is required');
    if (pickupLat === undefined || pickupLng === undefined || dropLat === undefined || dropLng === undefined) {
      throw new ValidationError('pickupLat, pickupLng, dropLat, and dropLng are required');
    }
    const passengerCount = Math.max(1, parseInt(String(rawPassengerCount || 1), 10) || 1);
    const scope =
      productLine === 'vip' ? 'vip' : productLine === 'shuttle' ? 'shuttle' : undefined;
    if (scope === 'shuttle') {
      const shuttleOk = await TenantFeaturesService.hasFeature(tenantId, 'transferShuttle');
      if (!shuttleOk) throw new ForbiddenError('Shuttle transfer is disabled for this tenant');
    }
    const fromZone = await service.findZoneContainingPoint(tenantId, Number(pickupLat), Number(pickupLng));
    const toZone = await service.findZoneContainingPoint(tenantId, Number(dropLat), Number(dropLng));
    const expectedType = fromZone && toZone && fromZone.id === toZone.id ? 'internal' : 'between';
    const vehicles = await TransferVehicleService.list(tenantId, scope ? { scope } : undefined);
    const suitableVehicles = vehicles.filter(
      (v: TransferVehicle) => v.isActive !== false && v.passengerCapacity >= passengerCount
    );
    let group: TransferZonePriceGroup | null = null;
    let flatPrices: TransferZonePrice[] = [];
    const priceRepo = AppDataSource.getRepository(TransferZonePrice);
    if (fromZone && toZone) {
      group = await service.getGroupByZones(tenantId, fromZone.id, toZone.id, expectedType as any);
      if (!group || !group.items?.length) group = await service.getGroupByZones(tenantId, toZone.id, fromZone.id, expectedType as any);
      if (!group || !group.items?.length) {
        flatPrices = await priceRepo.find({
          where: { tenantId, fromZoneId: fromZone.id, toZoneId: toZone.id, isActive: true, deletedAt: null as any },
          relations: ['vehicle'],
        });
        if (flatPrices.length === 0) {
          flatPrices = await priceRepo.find({
            where: { tenantId, fromZoneId: toZone.id, toZoneId: fromZone.id, isActive: true, deletedAt: null as any },
            relations: ['vehicle'],
          });
        }
      }
    }
    const prices: any[] = [];
    if (group && group.items && group.items.length > 0) {
      for (const v of suitableVehicles) {
        const matched = group.items.find((it: TransferZonePriceItem) => it.vehicleId === v.id) || group.items.find((it: TransferZonePriceItem) => !it.vehicleId);
        const priceVal = matched ? Number(matched.price) : null;
        if (priceVal == null) continue;
        prices.push({
          vehicleId: v.id, vehicleName: v.name, passengerCapacity: v.passengerCapacity, luggageCapacity: v.luggageCapacity,
          brand: v.brand ? v.brand.name : null, model: v.model ? v.model.name : null,
          images: (v.images || []).map((img: any) => img.imageUrl), price: priceVal, currencyCode: matched?.currencyCode ?? null,
        });
      }
    } else {
      for (const v of suitableVehicles) {
        const matched = flatPrices.find((p: TransferZonePrice) => p.vehicleId === v.id) || flatPrices.find((p: TransferZonePrice) => !p.vehicleId);
        const priceVal = matched ? Number(matched.price) : null;
        if (priceVal == null) continue;
        prices.push({
          vehicleId: v.id, vehicleName: v.name, passengerCapacity: v.passengerCapacity, luggageCapacity: v.luggageCapacity,
          brand: v.brand ? v.brand.name : null, model: v.model ? v.model.name : null,
          images: (v.images || []).map((img: any) => img.imageUrl), price: priceVal, currencyCode: (matched as any)?.currencyCode ?? null,
        });
      }
    }
    sendSuccess(res, {
      fromZone: fromZone ? { id: fromZone.id, name: fromZone.name } : null,
      toZone: toZone ? { id: toZone.id, name: toZone.name } : null,
      priceType: expectedType,
      passengerCount,
      prices,
      note: group ? `matched group id: ${group.id}` : (flatPrices.length ? 'legacy (reverse fallback)' : 'no group or legacy matched'),
    });
  }),
};


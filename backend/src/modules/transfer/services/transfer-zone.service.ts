import { Repository, IsNull } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferZone, PolygonJson } from '../entities/transfer-zone.entity';
import { TransferZonePrice } from '../entities/transfer-zone-price.entity';
import { TransferZonePriceGroup } from '../entities/transfer-zone-price-group.entity';
import { TransferZonePriceItem } from '../entities/transfer-zone-price-item.entity';

export class TransferZoneService {
  private zoneRepository: Repository<TransferZone>;
  private zonePriceRepository: Repository<TransferZonePrice>;
  private zonePriceGroupRepository: Repository<TransferZonePriceGroup>;
  private zonePriceItemRepository: Repository<TransferZonePriceItem>;

  constructor() {
    this.zoneRepository = AppDataSource.getRepository(TransferZone);
    this.zonePriceRepository = AppDataSource.getRepository(TransferZonePrice);
    this.zonePriceGroupRepository = AppDataSource.getRepository(TransferZonePriceGroup);
    this.zonePriceItemRepository = AppDataSource.getRepository(TransferZonePriceItem);
  }

  // Zone Management
  async listZones(tenantId: string): Promise<TransferZone[]> {
    return this.zoneRepository.find({
      where: { tenantId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async getZoneById(id: string, tenantId: string): Promise<TransferZone | null> {
    return this.zoneRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
  }

  async createZone(data: {
    tenantId: string;
    name: string;
    description?: string;
    polygonJson: PolygonJson;
    color?: string;
  }): Promise<TransferZone> {
    const zone = this.zoneRepository.create({
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      polygonJson: data.polygonJson,
      color: data.color || '#4CAF50',
      isActive: true,
    });
    return this.zoneRepository.save(zone);
  }

  async updateZone(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      description?: string;
      polygonJson?: PolygonJson;
      color?: string;
      isActive?: boolean;
    }
  ): Promise<TransferZone | null> {
    const zone = await this.getZoneById(id, tenantId);
    if (!zone) return null;

    if (data.name !== undefined) zone.name = data.name;
    if (data.description !== undefined) zone.description = data.description;
    if (data.polygonJson !== undefined) zone.polygonJson = data.polygonJson;
    if (data.color !== undefined) zone.color = data.color;
    if (data.isActive !== undefined) zone.isActive = data.isActive;

    return this.zoneRepository.save(zone);
  }

  async deleteZone(id: string, tenantId: string): Promise<boolean> {
    const zone = await this.getZoneById(id, tenantId);
    if (!zone) return false;

    // Soft delete
    zone.deletedAt = new Date();
    await this.zoneRepository.save(zone);

    // Soft delete related prices
    await this.zonePriceRepository
      .createQueryBuilder()
      .update(TransferZonePrice)
      .set({ deletedAt: new Date() })
      .where('(from_zone_id = :zoneId OR to_zone_id = :zoneId) AND tenant_id = :tenantId AND deleted_at IS NULL', {
        zoneId: id,
        tenantId,
      })
      .execute();

    return true;
  }

  // Zone Price Management
  async listPrices(tenantId: string): Promise<TransferZonePrice[]> {
    // Prefer grouped prices if any exist
    const groups = await this.zonePriceGroupRepository.find({
      where: { tenantId, deletedAt: IsNull() },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    if (groups && groups.length > 0) {
      // Filter out any deleted items (safety) and return groups
      const cleaned = groups.map((g) => {
        if (g.items && Array.isArray(g.items)) {
          g.items = g.items.filter((it) => !it.deletedAt);
        }
        return g;
      });
      return cleaned as unknown as TransferZonePrice[];
    }

    // Fallback to legacy flat prices
    return this.zonePriceRepository.find({
      where: { tenantId, deletedAt: IsNull() },
      relations: ['fromZone', 'toZone', 'vehicle'],
      order: { createdAt: 'DESC' },
    });
  }

  async setPrice(data: {
    tenantId: string;
    fromZoneId: string;
    toZoneId: string;
    priceType?: 'between' | 'internal';
    vehicleId?: string;
    price: number;
    currencyCode?: string;
  }): Promise<TransferZonePrice> {
    // Check if price already exists for the exact combination (tenant, from, to, vehicle, priceType)
    const existing = await this.zonePriceRepository.findOne({
      where: {
        tenantId: data.tenantId,
        fromZoneId: data.fromZoneId,
        toZoneId: data.toZoneId,
        vehicleId: data.vehicleId ? data.vehicleId : IsNull(),
        priceType: data.priceType || 'between',
        deletedAt: IsNull(),
      },
    });

    if (existing) {
      // Update existing price
      existing.price = data.price;
      existing.currencyCode = data.currencyCode || 'EUR';
      existing.isActive = true;
      return this.zonePriceRepository.save(existing);
    }

    // Create new price
    const price = this.zonePriceRepository.create({
      tenantId: data.tenantId,
      fromZoneId: data.fromZoneId,
      toZoneId: data.toZoneId,
      vehicleId: data.vehicleId,
      priceType: data.priceType || 'between',
      price: data.price,
      currencyCode: data.currencyCode || 'EUR',
      isActive: true,
    });

    return this.zonePriceRepository.save(price);
  }

  async setPricesBulk(data: {
    tenantId: string;
    fromZoneId: string;
    toZoneId: string;
    priceType?: 'between' | 'internal';
    vehiclePrices: Array<{ vehicleId?: string; price: number; currencyCode?: string }>;
  }): Promise<TransferZonePrice[]> {
    // Create a group record and items inside it
    const group = this.zonePriceGroupRepository.create({
      tenantId: data.tenantId,
      fromZoneId: data.fromZoneId,
      toZoneId: data.toZoneId,
      priceType: data.priceType || 'between',
      isActive: true,
    });
    const savedGroup = await this.zonePriceGroupRepository.save(group);

    const items: TransferZonePriceItem[] = [];
    for (const vp of data.vehiclePrices) {
      const item = this.zonePriceItemRepository.create({
        group: savedGroup,
        vehicleId: vp.vehicleId || null,
        price: vp.price,
        currencyCode: vp.currencyCode || 'EUR',
        isActive: true,
      });
      items.push(item);
    }
    await this.zonePriceItemRepository.save(items);

    return items as unknown as TransferZonePrice[];
  }

  async deletePrice(id: string, tenantId: string): Promise<boolean> {
    // Try to delete as group
    const group = await this.zonePriceGroupRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (group) {
      group.deletedAt = new Date();
      await this.zonePriceGroupRepository.save(group);
      // Soft-delete related items
      await this.zonePriceItemRepository
        .createQueryBuilder()
        .update(TransferZonePriceItem)
        .set({ deletedAt: new Date() } as any)
        .where('"groupId" = :groupId AND deleted_at IS NULL', { groupId: group.id })
        .execute();
      return true;
    }

    // Fallback to legacy price
    const price = await this.zonePriceRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!price) return false;
    price.deletedAt = new Date();
    await this.zonePriceRepository.save(price);
    return true;
  }

  async updatePriceById(
    id: string,
    tenantId: string,
    data: {
      fromZoneId?: string;
      toZoneId?: string;
      priceType?: 'between' | 'internal';
      vehicleId?: string | null;
      price?: number;
      currencyCode?: string;
      isActive?: boolean;
    }
  ): Promise<TransferZonePrice | null> {
    // Try update on group
    const group = await this.zonePriceGroupRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: ['items'],
    });
    if (group) {
      if (data.fromZoneId !== undefined) group.fromZoneId = data.fromZoneId;
      if (data.toZoneId !== undefined) group.toZoneId = data.toZoneId;
      if (data.priceType !== undefined) group.priceType = data.priceType;
      if (data.isActive !== undefined) group.isActive = data.isActive;
      await this.zonePriceGroupRepository.save(group);

      // If item-level price update provided (single item), try update first item
      if (group.items && group.items.length === 1 && (data.price !== undefined || data.currencyCode !== undefined || data.vehicleId !== undefined || data.isActive !== undefined)) {
        const item = group.items[0];
        if (data.vehicleId !== undefined) item.vehicleId = data.vehicleId || null;
        if (data.price !== undefined) item.price = data.price;
        if (data.currencyCode !== undefined) item.currencyCode = data.currencyCode;
        if (data.isActive !== undefined) item.isActive = data.isActive;
        await this.zonePriceItemRepository.save(item);
      }

      return group as unknown as TransferZonePrice;
    }

    // Fallback to legacy price
    const priceRecord = await this.zonePriceRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!priceRecord) return null;

    if (data.fromZoneId !== undefined) priceRecord.fromZoneId = data.fromZoneId;
    if (data.toZoneId !== undefined) priceRecord.toZoneId = data.toZoneId;
    if (data.priceType !== undefined) priceRecord.priceType = data.priceType;
    if (data.vehicleId !== undefined) priceRecord.vehicleId = data.vehicleId || undefined;
    if (data.price !== undefined) priceRecord.price = data.price;
    if (data.currencyCode !== undefined) priceRecord.currencyCode = data.currencyCode;
    if (data.isActive !== undefined) priceRecord.isActive = data.isActive;

    return this.zonePriceRepository.save(priceRecord);
  }

  async updateGroupWithItems(
    groupId: string,
    tenantId: string,
    data: {
      fromZoneId?: string;
      toZoneId?: string;
      priceType?: 'between' | 'internal';
      isActive?: boolean;
      items: Array<{ vehicleId?: string | null; price: number; currencyCode?: string }>;
    }
  ): Promise<TransferZonePriceGroup | null> {
    const group = await this.zonePriceGroupRepository.findOne({
      where: { id: groupId, tenantId, deletedAt: IsNull() },
    });
    if (!group) return null;

    if (data.fromZoneId !== undefined) group.fromZoneId = data.fromZoneId;
    if (data.toZoneId !== undefined) group.toZoneId = data.toZoneId;
    if (data.priceType !== undefined) group.priceType = data.priceType;
    if (data.isActive !== undefined) group.isActive = data.isActive;
    await this.zonePriceGroupRepository.save(group);

    // Remove existing items for the group
    await this.zonePriceItemRepository
      .createQueryBuilder()
      .delete()
      .from(TransferZonePriceItem)
      .where('"groupId" = :groupId', { groupId: group.id })
      .execute();

    // Insert new items
    const items: TransferZonePriceItem[] = [];
    for (const it of data.items) {
      const item = this.zonePriceItemRepository.create({
        group,
        vehicleId: it.vehicleId || null,
        price: it.price,
        currencyCode: it.currencyCode || 'EUR',
        isActive: true,
      });
      items.push(item);
    }
    await this.zonePriceItemRepository.save(items);

    // Return group with fresh items
    const updated = await this.zonePriceGroupRepository.findOne({
      where: { id: group.id, tenantId },
      relations: ['items'],
    });
    return updated || null;
  }

  // Point in Polygon Check
  private pointInPolygon(lng: number, lat: number, polygon: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1];
      const xj = polygon[j][0],
        yj = polygon[j][1];
      const intersect =
        yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  async findZoneContainingPoint(tenantId: string, lat: number, lng: number): Promise<TransferZone | null> {
    const zones = await this.listZones(tenantId);
    for (const zone of zones) {
      if (!zone.isActive) continue;
      const poly = zone.polygonJson.coordinates && zone.polygonJson.coordinates[0];
      if (!poly || poly.length === 0) continue;
      if (this.pointInPolygon(lng, lat, poly)) return zone;
    }
    return null;
  }

  // Get price for route
  async getPriceForRoute(
    tenantId: string,
    pickupLat: number,
    pickupLng: number,
    dropLat: number,
    dropLng: number,
    vehicleId?: string
  ): Promise<{
    price: number | null;
    fromZone: TransferZone | null;
    toZone: TransferZone | null;
    priceRecord: any | null;
  }> {
    const fromZone = await this.findZoneContainingPoint(tenantId, pickupLat, pickupLng);
    const toZone = await this.findZoneContainingPoint(tenantId, dropLat, dropLng);

    if (!fromZone || !toZone) {
      return { price: null, fromZone, toZone, priceRecord: null };
    }

    const expectedType = fromZone.id === toZone.id ? 'internal' : 'between';

    const tryGroup = async (fromId: string, toId: string) =>
      this.zonePriceGroupRepository.findOne({
        where: {
          tenantId,
          fromZoneId: fromId,
          toZoneId: toId,
          priceType: expectedType,
          isActive: true,
          deletedAt: IsNull(),
        },
        relations: ['items'],
      });

    let group = await tryGroup(fromZone.id, toZone.id);
    if (!group?.items?.length) {
      group = await tryGroup(toZone.id, fromZone.id);
    }

    if (group && group.items && group.items.length > 0) {
      let item = group.items.find((it) => it.vehicleId === vehicleId);
      if (!item) item = group.items.find((it) => !it.vehicleId);
      return {
        price: item ? Number(item.price) : null,
        fromZone,
        toZone,
        priceRecord: { group, item },
      };
    }

    const tryLegacy = (fromId: string, toId: string) =>
      this.zonePriceRepository.findOne({
        where: {
          tenantId,
          fromZoneId: fromId,
          toZoneId: toId,
          vehicleId: vehicleId ?? IsNull(),
          priceType: expectedType,
          isActive: true,
          deletedAt: IsNull(),
        },
        relations: ['fromZone', 'toZone', 'vehicle'],
      });

    let priceRecord = await tryLegacy(fromZone.id, toZone.id);
    if (!priceRecord) priceRecord = await tryLegacy(toZone.id, fromZone.id);

    return {
      price: priceRecord?.price ?? null,
      fromZone,
      toZone,
      priceRecord: priceRecord ?? null,
    };
  }

  async getGroupByZones(
    tenantId: string,
    fromZoneId: string,
    toZoneId: string,
    priceType: 'between' | 'internal'
  ): Promise<TransferZonePriceGroup | null> {
    const group = await this.zonePriceGroupRepository.findOne({
      where: {
        tenantId,
        fromZoneId,
        toZoneId,
        priceType,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['items'],
    });
    if (group) return group;

    // fallback: try without priceType constraint
    const anyGroup = await this.zonePriceGroupRepository.findOne({
      where: {
        tenantId,
        fromZoneId,
        toZoneId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['items'],
    });
    return anyGroup || null;
  }
}


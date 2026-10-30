import { ZoneEntity } from '../entities/zone.entity';
import { ZonePriceEntity } from '../entities/zone-price.entity';
import { CreateZoneDto } from '../dto/create-zone.dto';
import { UpdateZoneDto } from '../dto/update-zone.dto';
import { QuoteRequestDto } from '../dto/quote-request.dto';

// Lightweight UUID helper (no external deps)
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Point-in-polygon (ray-casting) using [lng,lat] polygon coordinates
function pointInPolygon(lng: number, lat: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export class PolygonPricingService {
  // In-memory stores for isolation
  private zones: ZoneEntity[] = [];
  private prices: ZonePriceEntity[] = [];

  constructor(initialZones?: ZoneEntity[], initialPrices?: ZonePriceEntity[]) {
    if (initialZones) this.zones = initialZones.slice();
    if (initialPrices) this.prices = initialPrices.slice();
  }

  // Entities
  listZones(tenant_id: string): ZoneEntity[] {
    return this.zones.filter(z => z.tenant_id === tenant_id);
  }

  getZoneById(id: string): ZoneEntity | null {
    return this.zones.find(z => z.id === id) || null;
  }

  createZone(dto: CreateZoneDto): ZoneEntity {
    const now = new Date().toISOString();
    const zone: ZoneEntity = {
      id: dto.id ?? uuidv4(),
      tenant_id: dto.tenant_id,
      name: dto.name,
      polygon_json: dto.polygon_json,
      created_at: now,
    };
    this.zones.push(zone);
    return zone;
  }

  updateZone(id: string, tenant_id: string, dto: UpdateZoneDto): ZoneEntity | null {
    const zone = this.zones.find(z => z.id === id && z.tenant_id === tenant_id);
    if (!zone) return null;
    if (dto.name !== undefined) zone.name = dto.name;
    if (dto.polygon_json !== undefined) zone.polygon_json = dto.polygon_json;
    return zone;
  }

  deleteZone(id: string, tenant_id: string): boolean {
    const idx = this.zones.findIndex(z => z.id === id && z.tenant_id === tenant_id);
    if (idx === -1) return false;
    this.zones.splice(idx, 1);
    // remove related prices
    this.prices = this.prices.filter(p => p.from_zone_id !== id && p.to_zone_id !== id);
    return true;
  }

  // Zone prices
  listPrices(tenant_id: string): ZonePriceEntity[] {
    return this.prices.filter(p => p.tenant_id === tenant_id);
  }

  setPrice(price: Omit<ZonePriceEntity, 'id'> & { id?: string }): ZonePriceEntity {
    const record: ZonePriceEntity = {
      id: price.id ?? uuidv4(),
      tenant_id: price.tenant_id,
      from_zone_id: price.from_zone_id,
      to_zone_id: price.to_zone_id,
      vehicle_type_id: price.vehicle_type_id,
      price: Number(price.price),
    };
    // replace if exists
    const idx = this.prices.findIndex(p =>
      p.tenant_id === record.tenant_id &&
      p.from_zone_id === record.from_zone_id &&
      p.to_zone_id === record.to_zone_id &&
      p.vehicle_type_id === record.vehicle_type_id
    );
    if (idx !== -1) this.prices[idx] = record;
    else this.prices.push(record);
    return record;
  }

  findZoneContainingPoint(tenant_id: string, lat: number, lng: number): ZoneEntity | null {
    const zones = this.zones.filter(z => z.tenant_id === tenant_id);
    for (const z of zones) {
      const poly = z.polygon_json.coordinates && z.polygon_json.coordinates[0];
      if (!poly || poly.length === 0) continue;
      // polygon coords expected as [ [lng,lat], ... ]
      if (pointInPolygon(lng, lat, poly)) return z;
    }
    return null;
  }

  // Main lookup
  getPriceForRoute(req: QuoteRequestDto): { price: number | null; fromZoneId?: string | null; toZoneId?: string | null } {
    const pickupZone = this.findZoneContainingPoint(req.tenant_id, req.pickup_lat, req.pickup_lng);
    const dropZone = this.findZoneContainingPoint(req.tenant_id, req.drop_lat, req.drop_lng);
    if (!pickupZone || !dropZone) return { price: null, fromZoneId: pickupZone?.id ?? null, toZoneId: dropZone?.id ?? null };
    const match = this.prices.find(p =>
      p.tenant_id === req.tenant_id &&
      p.from_zone_id === pickupZone.id &&
      p.to_zone_id === dropZone.id &&
      p.vehicle_type_id === req.vehicle_type_id
    );
    if (!match) return { price: null, fromZoneId: pickupZone.id, toZoneId: dropZone.id };
    return { price: match.price, fromZoneId: pickupZone.id, toZoneId: dropZone.id };
  }

  // Utility - clear all (for tests)
  resetAll(): void {
    this.zones = [];
    this.prices = [];
  }
}



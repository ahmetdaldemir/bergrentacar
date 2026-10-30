import { PolygonJson } from '../entities/zone.entity';

export interface CreateZoneDto {
  id?: string;
  tenant_id: string;
  name: string;
  polygon_json: PolygonJson;
}



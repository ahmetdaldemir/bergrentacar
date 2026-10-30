import { PolygonJson } from '../entities/zone.entity';

export interface UpdateZoneDto {
  name?: string;
  polygon_json?: PolygonJson;
}



export type PolygonJson = {
  type: 'Polygon';
  coordinates: number[][][]; // [ [ [lng, lat], ... ] ]
};

export interface ZoneEntity {
  id: string;
  tenant_id: string;
  name: string;
  polygon_json: PolygonJson;
  created_at: string; // ISO timestamp
}



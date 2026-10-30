export interface QuoteRequestDto {
  tenant_id: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_lat: number;
  drop_lng: number;
  vehicle_type_id: string;
}



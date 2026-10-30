/**
 * Channel Manager abstraction interface.
 * Phase 2: Concrete providers (Beds24, MyAllocator) implement this contract.
 */

export interface AvailabilityQuery {
  externalHotelId: string;
  startDate: Date;
  endDate: Date;
  roomTypeExternalId?: string;
}

export interface RoomAvailability {
  roomTypeExternalId: string;
  date: Date;
  available: number;
  price: number;
  currencyCode: string;
}

export interface BookingParams {
  externalHotelId: string;
  externalRoomTypeId?: string;
  checkIn: Date;
  checkOut: Date;
  numberOfRooms: number;
  numberOfGuests: number;
  customerName: string;
  customerEmail?: string;
  totalPrice: number;
  currencyCode: string;
}

export interface IChannelManagerProvider {
  testConnection(config: Record<string, unknown>): Promise<boolean>;
  getAvailability(config: Record<string, unknown>, params: AvailabilityQuery): Promise<RoomAvailability[]>;
  createBooking(config: Record<string, unknown>, params: BookingParams): Promise<{ externalId: string }>;
  cancelBooking(config: Record<string, unknown>, externalId: string): Promise<void>;
}

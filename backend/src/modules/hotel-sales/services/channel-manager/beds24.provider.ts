/**
 * Beds24 Channel Manager Provider
 *
 * Phase 2 implementation. Beds24 REST API v2 kullanılır.
 * Belgeler: https://beds24.com/api/v2
 *
 * Config beklentisi (tenant_hotels.channel_manager_config jsonb):
 *   { apiKey: string, propKey?: string, roomId?: string }
 */

import {
  IChannelManagerProvider,
  AvailabilityQuery,
  RoomAvailability,
  BookingParams,
} from './channel-manager.interface';

const BEDS24_BASE = 'https://beds24.com/api/v2';

async function fetchBeds24(
  path: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${BEDS24_BASE}${path}`, {
    ...options,
    headers: {
      'token': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Beds24 API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const Beds24Provider: IChannelManagerProvider = {
  async testConnection(config: Record<string, unknown>): Promise<boolean> {
    const apiKey = config.apiKey as string;
    if (!apiKey) return false;
    try {
      await fetchBeds24('/authentication/setup', apiKey);
      return true;
    } catch {
      return false;
    }
  },

  async getAvailability(
    config: Record<string, unknown>,
    params: AvailabilityQuery,
  ): Promise<RoomAvailability[]> {
    const apiKey = config.apiKey as string;
    const propKey = config.propKey as string | undefined;
    if (!apiKey) throw new Error('Beds24 apiKey missing');

    const startIso = params.startDate.toISOString().substring(0, 10);
    const endIso = params.endDate.toISOString().substring(0, 10);

    const qs = new URLSearchParams({
      startDate: startIso,
      endDate: endIso,
      ...(propKey ? { propId: propKey } : {}),
    });

    const data = await fetchBeds24(`/inventory/rooms/availability?${qs}`, apiKey) as any[];

    return (data ?? []).map((item) => ({
      roomTypeExternalId: String(item.roomId ?? item.id ?? ''),
      date: new Date(item.date),
      available: Number(item.qty ?? item.available ?? 0),
      price: Number(item.price ?? 0),
      currencyCode: String(item.currency ?? 'EUR'),
    }));
  },

  async createBooking(
    config: Record<string, unknown>,
    params: BookingParams,
  ): Promise<{ externalId: string }> {
    const apiKey = config.apiKey as string;
    if (!apiKey) throw new Error('Beds24 apiKey missing');

    const body = {
      propId: config.propKey,
      roomId: config.roomId ?? params.externalRoomTypeId,
      arrival: params.checkIn.toISOString().substring(0, 10),
      departure: params.checkOut.toISOString().substring(0, 10),
      numAdult: params.numberOfGuests,
      numRooms: params.numberOfRooms,
      guestName: params.customerName,
      guestEmail: params.customerEmail ?? '',
      totalPrice: params.totalPrice,
      currency: params.currencyCode,
      status: 1, // 1 = confirmed
    };

    const result = await fetchBeds24('/bookings', apiKey, {
      method: 'POST',
      body: JSON.stringify(body),
    }) as any;

    const externalId = String(result?.bookId ?? result?.id ?? '');
    if (!externalId) throw new Error('Beds24 did not return a booking ID');
    return { externalId };
  },

  async cancelBooking(config: Record<string, unknown>, externalId: string): Promise<void> {
    const apiKey = config.apiKey as string;
    if (!apiKey) throw new Error('Beds24 apiKey missing');

    await fetchBeds24(`/bookings/${externalId}`, apiKey, {
      method: 'PATCH',
      body: JSON.stringify({ status: 0 }), // 0 = cancelled
    });
  },
};

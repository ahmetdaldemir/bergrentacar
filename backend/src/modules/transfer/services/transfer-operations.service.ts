import { Between, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferReservation, TransferReservationStatus } from '../entities/transfer-reservation.entity';
import { TransferVehicleService } from './transfer-vehicle.service';
import { TransferDriverService } from './transfer-driver.service';
import { TransferReservationService } from './transfer-reservation.service';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';
import { GoogleMapsService } from '../../../services/google-maps.service';

const BUFFER_MS = 5 * 60 * 1000;

function combineDateAndTime(transferDate: Date, transferTime: string): Date {
  const d = new Date(transferDate);
  const parts = String(transferTime || '00:00').split(':');
  const hh = parseInt(parts[0] || '0', 10);
  const mm = parseInt(parts[1] || '0', 10);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function estimateDurationSeconds(distanceMeters: number, durationSecondsFromApi: number): number {
  if (durationSecondsFromApi > 0) return durationSecondsFromApi;
  const km = Math.max(0.5, distanceMeters / 1000);
  return Math.round((km / 45) * 3600);
}

export type TransferEtaResult = {
  outboundPickupAt: string;
  estimatedOutboundDropoffAt: string;
  estimatedVehicleFreeAt: string;
  outboundDurationSeconds: number;
  outboundApproximate: boolean;
  returnPickupAt?: string | null;
  estimatedReturnDropoffAt?: string | null;
  estimatedReturnVehicleFreeAt?: string | null;
  returnDurationSeconds?: number;
  returnApproximate?: boolean;
};

export class TransferOperationsService {
  static async getEtaForReservation(reservationId: string, tenantId: string): Promise<TransferEtaResult | null> {
    const r = await TransferReservationService.getById(reservationId, tenantId);
    if (!r) return null;

    const pickupLat = r.pickupLat;
    const pickupLng = r.pickupLng;
    const dropoffLat = r.dropoffLat;
    const dropoffLng = r.dropoffLng;
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return null;
    }

    const apiKey = await TenantSettingsService.getGoogleMapsApiKey(tenantId);
    const oLat = parseFloat(pickupLat);
    const oLng = parseFloat(pickupLng);
    const dLat = parseFloat(dropoffLat);
    const dLng = parseFloat(dropoffLng);

    const outbound = await GoogleMapsService.calculateDistanceCoordsWithFallback(
      { lat: oLat, lng: oLng },
      { lat: dLat, lng: dLng },
      { apiKey }
    );
    const outDuration = estimateDurationSeconds(outbound.distanceMeters, outbound.durationSeconds);
    const outApprox = outbound.approximate === true || outbound.status === 'APPROXIMATE';

    const pickupAt = combineDateAndTime(r.transferDate, r.transferTime);
    const dropoffAt = new Date(pickupAt.getTime() + outDuration * 1000 + BUFFER_MS);

    let estimatedVehicleFreeAt = new Date(dropoffAt);

    let returnPickupAt: Date | null = null;
    let estimatedReturnDropoffAt: Date | null = null;
    let estimatedReturnVehicleFreeAt: Date | null = null;
    let returnDurationSeconds: number | undefined;
    let returnApproximate: boolean | undefined;

    if (r.isRoundTrip && r.returnTransferDate && r.returnTransferTime) {
      const rplat = r.returnPickupLat;
      const rplng = r.returnPickupLng;
      const rdlat = r.returnDropoffLat;
      const rdlng = r.returnDropoffLng;
      if (rplat && rplng && rdlat && rdlng) {
        const ret = await GoogleMapsService.calculateDistanceCoordsWithFallback(
          { lat: parseFloat(rplat), lng: parseFloat(rplng) },
          { lat: parseFloat(rdlat), lng: parseFloat(rdlng) },
          { apiKey }
        );
        returnDurationSeconds = estimateDurationSeconds(ret.distanceMeters, ret.durationSeconds);
        returnApproximate = ret.approximate === true || ret.status === 'APPROXIMATE';
        returnPickupAt = combineDateAndTime(new Date(r.returnTransferDate), r.returnTransferTime);
        estimatedReturnDropoffAt = new Date(returnPickupAt.getTime() + returnDurationSeconds * 1000 + BUFFER_MS);
        estimatedReturnVehicleFreeAt = new Date(estimatedReturnDropoffAt.getTime());
        estimatedVehicleFreeAt = estimatedReturnVehicleFreeAt;
      }
    }

    return {
      outboundPickupAt: pickupAt.toISOString(),
      estimatedOutboundDropoffAt: dropoffAt.toISOString(),
      estimatedVehicleFreeAt: estimatedVehicleFreeAt.toISOString(),
      outboundDurationSeconds: outDuration,
      outboundApproximate: outApprox,
      returnPickupAt: returnPickupAt?.toISOString() ?? null,
      estimatedReturnDropoffAt: estimatedReturnDropoffAt?.toISOString() ?? null,
      estimatedReturnVehicleFreeAt: estimatedReturnVehicleFreeAt?.toISOString() ?? null,
      returnDurationSeconds,
      returnApproximate,
    };
  }

  static async getAvailabilitySnapshot(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const reservationRepo = AppDataSource.getRepository(TransferReservation);
    /** Operasyon “açık işler” ile uyumlu: bugün atanmış bekleyen + onaylı + devam eden */
    const active = await reservationRepo.find({
      where: {
        tenantId,
        transferDate: Between(start, end),
        status: In([
          TransferReservationStatus.PENDING,
          TransferReservationStatus.CONFIRMED,
          TransferReservationStatus.IN_PROGRESS,
        ]),
      },
      select: ['id', 'reference', 'vehicleId', 'driverId', 'status', 'transferDate', 'transferTime'],
    });

    const vehicleBusy = new Map<string, number>();
    const driverBusy = new Map<string, number>();
    for (const row of active) {
      if (row.vehicleId) {
        vehicleBusy.set(row.vehicleId, (vehicleBusy.get(row.vehicleId) || 0) + 1);
      }
      if (row.driverId) {
        driverBusy.set(row.driverId, (driverBusy.get(row.driverId) || 0) + 1);
      }
    }

    const [vehicles, drivers] = await Promise.all([
      TransferVehicleService.list(tenantId),
      TransferDriverService.list(tenantId),
    ]);

    return {
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      activeReservationCount: active.length,
      vehicles: vehicles.map((v) => ({
        id: v.id,
        name: v.name,
        isActive: v.isActive,
        busyJobsToday: vehicleBusy.get(v.id) || 0,
      })),
      drivers: drivers.map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        isActive: d.isActive,
        isAvailable: d.isAvailable,
        busyJobsToday: driverBusy.get(d.id) || 0,
      })),
    };
  }
}

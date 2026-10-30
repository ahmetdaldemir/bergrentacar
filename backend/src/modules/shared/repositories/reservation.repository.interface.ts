import { Reservation, ReservationStatus } from '../entities/reservation.entity';

/**
 * Rezervasyon veri erişim katmanı arayüzü.
 *
 * Servisler bu interface'e bağlıdır; gerçek implementasyon
 * TypeORM kullanır, test implementasyonu ise in-memory mock döner.
 * Böylece unit testler DB bağlantısı gerektirmez.
 */
export interface IReservationRepository {
  findById(id: string, relations?: string[]): Promise<Reservation | null>;
  findByTenantId(tenantId: string): Promise<Reservation[]>;
  save(reservation: Reservation): Promise<Reservation>;
  findByStatus(tenantId: string, status: ReservationStatus): Promise<Reservation[]>;
}

/**
 * Testlerde kullanılacak hafif mock implementasyon.
 * Her metot jest.fn() ile override edilebilir.
 */
export class MockReservationRepository implements IReservationRepository {
  findById = jest.fn<Promise<Reservation | null>, [string, string[]?]>().mockResolvedValue(null);
  findByTenantId = jest.fn<Promise<Reservation[]>, [string]>().mockResolvedValue([]);
  save = jest.fn<Promise<Reservation>, [Reservation]>().mockImplementation((r) => Promise.resolve(r));
  findByStatus = jest.fn<Promise<Reservation[]>, [string, ReservationStatus]>().mockResolvedValue([]);
}

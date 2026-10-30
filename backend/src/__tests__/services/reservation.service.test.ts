/**
 * Unit Tests for ReservationService
 *
 * AppDataSource.getRepository mock'lanır; gerçek DB bağlantısı gerekmez.
 */

jest.mock('../../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../services/reservation-email.service', () => ({
  sendReservationConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendReservationCancelledEmail: jest.fn().mockResolvedValue(undefined),
  sendReservationCompletedEmail: jest.fn().mockResolvedValue(undefined),
  sendReservationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/survey-email.service', () => ({
  sendSurveyEmailForReservation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../modules/shared/services/reservation-handler.registry', () => {
  const { ReservationStatus } = require('../../modules/shared/entities/reservation.entity');
  const rentacarCheckout = (reservation: any) => {
    const meta = reservation.metadata || {};
    if (meta.checkoutCompletedAt || meta.operationPickupCompletedAt) {
      throw new Error('Vehicle already checked out');
    }
    const result: any = { checkIn: new Date() };
    if (reservation.status === ReservationStatus.PENDING) result.newStatus = ReservationStatus.CONFIRMED;
    return result;
  };
  const rentacarCheckin = (reservation: any) => {
    const meta = reservation.metadata || {};
    const hasOutbound = meta.checkoutCompletedAt || meta.operationPickupCompletedAt;
    if (!hasOutbound) throw new Error('Vehicle must be checked out before checkin');
    if (meta.checkinCompletedAt || meta.operationReturnCompletedAt) {
      throw new Error('Vehicle already checked in');
    }
    return { checkOut: new Date(), newStatus: ReservationStatus.COMPLETED };
  };
  return {
    ReservationHandlerRegistry: {
      get: (type: string) =>
        type === 'rentacar' ? { checkout: rentacarCheckout, checkin: rentacarCheckin } : undefined,
    },
  };
});

import { AppDataSource } from '../../config/data-source';
import { ReservationService } from '../../modules/shared/services/reservation.service';
import { ReservationStatus } from '../../modules/shared/entities/reservation.entity';

const makeReservation = (overrides: Record<string, any> = {}) => ({
  id: 'res-1',
  tenantId: 'tenant-1',
  reference: 'REF-001',
  type: 'tour',
  status: ReservationStatus.PENDING,
  customerEmail: 'customer@example.com',
  notes: '',
  metadata: {},
  checkIn: null,
  checkOut: null,
  customerLanguage: null,
  ...overrides,
});

describe('ReservationService', () => {
  let mockRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);
  });

  // ─── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('should return reservation when found', async () => {
      const reservation = makeReservation();
      mockRepo.findOne.mockResolvedValue(reservation);

      const result = await ReservationService.getById('res-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'res-1' } }),
      );
      expect(result).toEqual(reservation);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await ReservationService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ─── list ────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should return all reservations for a tenant', async () => {
      const reservations = [makeReservation(), makeReservation({ id: 'res-2' })];
      mockRepo.find.mockResolvedValue(reservations);

      const result = await ReservationService.list('tenant-1');

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no reservations', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await ReservationService.list('tenant-empty');

      expect(result).toEqual([]);
    });
  });

  // ─── addNote ─────────────────────────────────────────────────────────────────

  describe('addNote', () => {
    it('should append note with timestamp to reservation', async () => {
      const reservation = makeReservation({ notes: '' });
      mockRepo.findOne.mockResolvedValue(reservation);
      mockRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      await ReservationService.addNote('res-1', 'Test notu');

      const savedArg = mockRepo.save.mock.calls[0][0];
      expect(savedArg.notes).toContain('Test notu');
    });

    it('should throw when reservation not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(ReservationService.addNote('nonexistent', 'Not')).rejects.toThrow(
        'Reservation not found',
      );
    });

    it('should preserve existing notes', async () => {
      const reservation = makeReservation({ notes: '[existing] Önceki not\n' });
      mockRepo.findOne.mockResolvedValue(reservation);
      mockRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      await ReservationService.addNote('res-1', 'Yeni not');

      const savedArg = mockRepo.save.mock.calls[0][0];
      expect(savedArg.notes).toContain('[existing] Önceki not');
      expect(savedArg.notes).toContain('Yeni not');
    });
  });

  // ─── cancelReservation ───────────────────────────────────────────────────────

  describe('cancelReservation', () => {
    it('should cancel an active reservation', async () => {
      const reservation = makeReservation({ status: ReservationStatus.PENDING });
      mockRepo.findOne.mockResolvedValue(reservation);
      mockRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      const result = await ReservationService.cancelReservation('res-1');

      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });

    it('should throw when reservation is already cancelled', async () => {
      const reservation = makeReservation({ status: ReservationStatus.CANCELLED });
      mockRepo.findOne.mockResolvedValue(reservation);

      await expect(ReservationService.cancelReservation('res-1')).rejects.toThrow(
        'Reservation is already cancelled',
      );
    });

    it('should throw when reservation is completed', async () => {
      const reservation = makeReservation({ status: ReservationStatus.COMPLETED });
      mockRepo.findOne.mockResolvedValue(reservation);

      await expect(ReservationService.cancelReservation('res-1')).rejects.toThrow(
        'Cannot cancel a completed reservation',
      );
    });

    it('should throw when reservation not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(ReservationService.cancelReservation('nonexistent')).rejects.toThrow(
        'Reservation not found',
      );
    });

    it('should add cancel reason to notes', async () => {
      const reservation = makeReservation({ status: ReservationStatus.PENDING, notes: '' });
      mockRepo.findOne.mockResolvedValue(reservation);
      mockRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      await ReservationService.cancelReservation('res-1', 'Müşteri isteği');

      const savedArg = mockRepo.save.mock.calls[0][0];
      expect(savedArg.notes).toContain('Müşteri isteği');
    });
  });

  // ─── processCheckout (araç çıkış) ────────────────────────────────────────────

  describe('processCheckout', () => {
    it('should set checkIn date for rentacar reservation', async () => {
      const reservation = makeReservation({ type: 'rentacar', status: ReservationStatus.PENDING, checkIn: null });
      mockRepo.findOne.mockResolvedValue(reservation);
      mockRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      const result = await ReservationService.processCheckout('res-1');

      expect(result.checkIn).toBeInstanceOf(Date);
    });

    it('should throw when reservation is not rentacar type', async () => {
      const reservation = makeReservation({ type: 'tour' });
      mockRepo.findOne.mockResolvedValue(reservation);

      await expect(ReservationService.processCheckout('res-1')).rejects.toThrow(
        'Checkout is not supported for this reservation type',
      );
    });

    it('should throw when already checked out', async () => {
      const reservation = makeReservation({
        type: 'rentacar',
        checkIn: new Date(),
        metadata: { checkoutCompletedAt: '2020-01-01T00:00:00.000Z' },
      });
      mockRepo.findOne.mockResolvedValue(reservation);

      await expect(ReservationService.processCheckout('res-1')).rejects.toThrow(
        'Vehicle already checked out',
      );
    });

    it('should throw when reservation not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(ReservationService.processCheckout('nonexistent')).rejects.toThrow(
        'Reservation not found',
      );
    });
  });

  // ─── processCheckin (araç dönüş) ─────────────────────────────────────────────

  describe('processCheckin', () => {
    it('should set checkOut date and mark as completed', async () => {
      const reservation = makeReservation({
        type: 'rentacar',
        checkIn: new Date(),
        checkOut: null,
        status: ReservationStatus.CONFIRMED,
        metadata: { checkoutCompletedAt: '2020-01-01T00:00:00.000Z' },
      });
      mockRepo.findOne.mockResolvedValue(reservation);
      mockRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      const result = await ReservationService.processCheckin('res-1');

      expect(result.checkOut).toBeInstanceOf(Date);
      expect(result.status).toBe(ReservationStatus.COMPLETED);
    });

    it('should throw when reservation is not rentacar type', async () => {
      const reservation = makeReservation({ type: 'tour' });
      mockRepo.findOne.mockResolvedValue(reservation);

      await expect(ReservationService.processCheckin('res-1')).rejects.toThrow(
        'Checkin is not supported for this reservation type',
      );
    });

    it('should throw when not yet checked out', async () => {
      const reservation = makeReservation({ type: 'rentacar', checkIn: null, metadata: {} });
      mockRepo.findOne.mockResolvedValue(reservation);

      await expect(ReservationService.processCheckin('res-1')).rejects.toThrow(
        'Vehicle must be checked out before checkin',
      );
    });

    it('should throw when already checked in', async () => {
      const reservation = makeReservation({
        type: 'rentacar',
        checkIn: new Date(),
        checkOut: new Date(),
        metadata: {
          checkoutCompletedAt: '2020-01-01T00:00:00.000Z',
          checkinCompletedAt: '2020-01-02T00:00:00.000Z',
        },
      });
      mockRepo.findOne.mockResolvedValue(reservation);

      await expect(ReservationService.processCheckin('res-1')).rejects.toThrow(
        'Vehicle already checked in',
      );
    });
  });

  // ─── sendConfirmationEmail ───────────────────────────────────────────────────

  describe('sendConfirmationEmail', () => {
    it('should throw when reservation not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(ReservationService.sendConfirmationEmail('nonexistent')).rejects.toThrow(
        'Reservation not found',
      );
    });

    it('should throw when no customer email', async () => {
      const reservation = makeReservation({ customerEmail: null });
      mockRepo.findOne.mockResolvedValue(reservation);

      await expect(ReservationService.sendConfirmationEmail('res-1')).rejects.toThrow(
        'Reservation has no customer email',
      );
    });
  });
});

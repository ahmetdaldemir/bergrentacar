import { LessThan, MoreThan } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { HotelContract, BoardType } from '../entities/hotel-contract.entity';
import { HotelReservation, HotelReservationStatus } from '../entities/hotel-reservation.entity';
import { TenantHotelService } from './tenant-hotel.service';
import { NotFoundError, ValidationError } from '../../../utils/errors';

export type CreateContractInput = {
  tenantId: string;
  hotelId: string;
  roomTypeId: string;
  startDate: string;
  endDate: string;
  totalRooms: number;
  pricePerNight: number;
  currencyCode?: string;
  boardType?: BoardType;
  notes?: string;
};

export type UpdateContractInput = Partial<Omit<CreateContractInput, 'tenantId' | 'hotelId' | 'roomTypeId'>> & {
  isActive?: boolean;
};

export type ContractAvailability = {
  contract: HotelContract;
  totalRooms: number;
  soldRooms: number;
  availableRooms: number;
};

export class HotelContractService {
  private static repo() {
    return AppDataSource.getRepository(HotelContract);
  }

  private static reservationRepo() {
    return AppDataSource.getRepository(HotelReservation);
  }

  static async list(tenantId: string, hotelId?: string): Promise<HotelContract[]> {
    const where: Record<string, unknown> = { tenantId };
    if (hotelId) where.hotelId = hotelId;
    return this.repo().find({
      where,
      relations: ['hotel', 'roomType'],
      order: { startDate: 'ASC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<HotelContract> {
    const contract = await this.repo().findOne({
      where: { id, tenantId },
      relations: ['hotel', 'roomType'],
    });
    if (!contract) throw new NotFoundError('HotelContract', id);
    return contract;
  }

  static async create(input: CreateContractInput): Promise<HotelContract> {
    await TenantHotelService.getById(input.hotelId, input.tenantId);

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (endDate <= startDate) {
      throw new ValidationError('endDate must be after startDate');
    }

    const repo = this.repo();
    const contract = repo.create({
      tenantId: input.tenantId,
      hotelId: input.hotelId,
      roomTypeId: input.roomTypeId,
      startDate,
      endDate,
      totalRooms: input.totalRooms,
      pricePerNight: input.pricePerNight,
      currencyCode: input.currencyCode ?? 'EUR',
      boardType: input.boardType ?? BoardType.BREAKFAST,
      notes: input.notes,
      isActive: true,
    });
    return repo.save(contract);
  }

  static async update(id: string, tenantId: string, input: UpdateContractInput): Promise<HotelContract> {
    const contract = await this.getById(id, tenantId);
    if (input.startDate) (contract as any).startDate = new Date(input.startDate);
    if (input.endDate) (contract as any).endDate = new Date(input.endDate);
    const { startDate: _s, endDate: _e, ...rest } = input;
    Object.assign(contract, rest);
    if (contract.endDate <= contract.startDate) {
      throw new ValidationError('endDate must be after startDate');
    }
    return this.repo().save(contract);
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const contract = await this.getById(id, tenantId);
    await this.repo().remove(contract);
  }

  /**
   * Calculates real-time availability for a contract on a given date range.
   * soldRooms = SUM of active reservations that overlap with [checkIn, checkOut).
   */
  static async getAvailability(contractId: string, tenantId: string, checkIn: Date, checkOut: Date): Promise<ContractAvailability> {
    const contract = await this.getById(contractId, tenantId);

    const soldResult = await this.reservationRepo()
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.number_of_rooms), 0)', 'total')
      .where('r.contract_id = :contractId', { contractId })
      .andWhere('r.status NOT IN (:...statuses)', { statuses: [HotelReservationStatus.CANCELLED] })
      .andWhere('r.check_in < :checkOut', { checkOut })
      .andWhere('r.check_out > :checkIn', { checkIn })
      .getRawOne<{ total: string }>();

    const soldRooms = parseInt(soldResult?.total ?? '0', 10);

    return {
      contract,
      totalRooms: contract.totalRooms,
      soldRooms,
      availableRooms: contract.totalRooms - soldRooms,
    };
  }

  /**
   * Find contracts that cover a given date range for a room type.
   */
  static async findCoveringContracts(
    tenantId: string,
    hotelId: string,
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<ContractAvailability[]> {
    const contracts = await this.repo().find({
      where: {
        tenantId,
        hotelId,
        roomTypeId,
        isActive: true,
        startDate: LessThan(checkOut),
        endDate: MoreThan(checkIn),
      },
      relations: ['roomType'],
    });

    return Promise.all(contracts.map((c) => this.getAvailability(c.id, tenantId, checkIn, checkOut)));
  }
}

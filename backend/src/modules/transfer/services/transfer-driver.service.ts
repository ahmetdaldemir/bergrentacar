import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferDriver } from '../entities/transfer-driver.entity';

export type CreateTransferDriverInput = {
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  languages?: string[];
  isAvailable?: boolean;
  isActive?: boolean;
  notes?: string;
};

export type UpdateTransferDriverInput = Partial<Omit<CreateTransferDriverInput, 'tenantId'>>;

export class TransferDriverService {
  private static driverRepo(): Repository<TransferDriver> {
    return AppDataSource.getRepository(TransferDriver);
  }

  static async list(tenantId: string): Promise<TransferDriver[]> {
    return this.driverRepo().find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<TransferDriver | null> {
    return this.driverRepo().findOne({
      where: { id, tenantId },
    });
  }

  static async create(input: CreateTransferDriverInput): Promise<TransferDriver> {
    const driver = this.driverRepo().create({
      ...input,
      isAvailable: input.isAvailable ?? true,
      isActive: input.isActive ?? true,
      licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : undefined,
    });
    return this.driverRepo().save(driver);
  }

  static async update(id: string, tenantId: string, input: UpdateTransferDriverInput): Promise<TransferDriver> {
    const driver = await this.getById(id, tenantId);
    if (!driver) {
      throw new Error('Transfer driver not found');
    }

    if (input.licenseExpiry) {
      input.licenseExpiry = new Date(input.licenseExpiry).toISOString();
    }

    Object.assign(driver, input);
    if (input.licenseExpiry) {
      driver.licenseExpiry = new Date(input.licenseExpiry);
    }
    return this.driverRepo().save(driver);
  }

  static async delete(id: string, tenantId: string): Promise<void> {
    const driver = await this.getById(id, tenantId);
    if (!driver) {
      throw new Error('Transfer driver not found');
    }
    await this.driverRepo().remove(driver);
  }

  static async getAvailableDrivers(tenantId: string): Promise<TransferDriver[]> {
    return this.driverRepo().find({
      where: { tenantId, isAvailable: true, isActive: true },
      order: { name: 'ASC' },
    });
  }
}


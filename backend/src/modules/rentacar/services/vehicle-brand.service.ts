import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { VehicleBrand } from '../entities/vehicle-brand.entity';

export type CreateVehicleBrandInput = {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateVehicleBrandInput = Partial<CreateVehicleBrandInput>;

export class VehicleBrandService {
  private static brandRepo(): Repository<VehicleBrand> {
    return AppDataSource.getRepository(VehicleBrand);
  }

  static async list(): Promise<VehicleBrand[]> {
    return this.brandRepo().find({
      relations: ['models'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  static async create(input: CreateVehicleBrandInput): Promise<VehicleBrand> {
    const existing = await this.brandRepo().findOne({ where: { name: input.name } });
    if (existing) {
      throw new Error('Brand name already exists');
    }

    const brand = this.brandRepo().create({
      name: input.name.trim(),
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    });

    return this.brandRepo().save(brand);
  }

  static async getById(id: string): Promise<VehicleBrand | null> {
    return this.brandRepo().findOne({
      where: { id },
      relations: ['models'],
    });
  }

  static async update(id: string, input: UpdateVehicleBrandInput): Promise<VehicleBrand> {
    const brand = await this.brandRepo().findOne({ where: { id } });
    if (!brand) {
      throw new Error('Vehicle brand not found');
    }

    if (input.name !== undefined) {
      const existing = await this.brandRepo().findOne({ where: { name: input.name } });
      if (existing && existing.id !== id) {
        throw new Error('Brand name already exists');
      }
      brand.name = input.name.trim();
    }
    if (input.sortOrder !== undefined) brand.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) brand.isActive = input.isActive;

    return this.brandRepo().save(brand);
  }

  static async remove(id: string): Promise<void> {
    const brand = await this.brandRepo().findOne({ where: { id } });
    if (!brand) {
      throw new Error('Vehicle brand not found');
    }
    await this.brandRepo().remove(brand);
  }
}


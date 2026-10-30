import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { VehicleModel } from '../entities/vehicle-model.entity';
import { VehicleBrand } from '../entities/vehicle-brand.entity';

export type CreateVehicleModelInput = {
  brandId: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateVehicleModelInput = Partial<Omit<CreateVehicleModelInput, 'brandId'>>;

export class VehicleModelService {
  private static modelRepo(): Repository<VehicleModel> {
    return AppDataSource.getRepository(VehicleModel);
  }

  private static brandRepo(): Repository<VehicleBrand> {
    return AppDataSource.getRepository(VehicleBrand);
  }

  static async list(brandId?: string): Promise<VehicleModel[]> {
    const query = this.modelRepo().createQueryBuilder('model')
      .leftJoinAndSelect('model.brand', 'brand')
      .orderBy('model.sortOrder', 'ASC')
      .addOrderBy('model.name', 'ASC');

    if (brandId) {
      query.where('model.brandId = :brandId', { brandId });
    }

    return query.getMany();
  }

  static async create(input: CreateVehicleModelInput): Promise<VehicleModel> {
    const brand = await this.brandRepo().findOne({ where: { id: input.brandId } });
    if (!brand) {
      throw new Error('Vehicle brand not found');
    }

    const existing = await this.modelRepo().findOne({
      where: { brandId: input.brandId, name: input.name },
    });
    if (existing) {
      throw new Error('Model name already exists for this brand');
    }

    const model = this.modelRepo().create({
      brand,
      brandId: input.brandId,
      name: input.name.trim(),
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    });

    return this.modelRepo().save(model);
  }

  static async getById(id: string): Promise<VehicleModel | null> {
    return this.modelRepo().findOne({
      where: { id },
      relations: ['brand'],
    });
  }

  static async update(id: string, input: UpdateVehicleModelInput): Promise<VehicleModel> {
    const model = await this.modelRepo().findOne({ where: { id } });
    if (!model) {
      throw new Error('Vehicle model not found');
    }

    if (input.name !== undefined) {
      const existing = await this.modelRepo().findOne({
        where: { brandId: model.brandId, name: input.name },
      });
      if (existing && existing.id !== id) {
        throw new Error('Model name already exists for this brand');
      }
      model.name = input.name.trim();
    }
    if (input.sortOrder !== undefined) model.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) model.isActive = input.isActive;

    return this.modelRepo().save(model);
  }

  static async remove(id: string): Promise<void> {
    const model = await this.modelRepo().findOne({ where: { id } });
    if (!model) {
      throw new Error('Vehicle model not found');
    }
    await this.modelRepo().remove(model);
  }
}


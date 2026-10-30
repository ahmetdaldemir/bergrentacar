import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { VehicleImage } from '../entities/vehicle-image.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { NotFoundError } from '../../../utils/errors';

const MAX_IMAGES_PER_VEHICLE = 8;

export type CreateVehicleImageInput = {
  vehicleId: string;
  url: string;
  alt?: string;
  order?: number;
  isPrimary?: boolean;
};

export type UpdateVehicleImageInput = Partial<Omit<CreateVehicleImageInput, 'vehicleId'>>;

export class VehicleImageService {
  private static imageRepo(): Repository<VehicleImage> {
    return AppDataSource.getRepository(VehicleImage);
  }

  private static vehicleRepo(): Repository<Vehicle> {
    return AppDataSource.getRepository(Vehicle);
  }

  static async list(vehicleId: string, tenantId: string): Promise<VehicleImage[]> {
    // Verify vehicle exists and belongs to tenant
    const vehicle = await this.vehicleRepo().findOne({
      where: { id: vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle', vehicleId);
    }

    return this.imageRepo().find({
      where: { vehicleId },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  static async getById(id: string, vehicleId: string, tenantId: string): Promise<VehicleImage | null> {
    // Verify vehicle exists and belongs to tenant
    const vehicle = await this.vehicleRepo().findOne({
      where: { id: vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle', vehicleId);
    }

    return this.imageRepo().findOne({
      where: { id, vehicleId },
    });
  }

  static async create(input: CreateVehicleImageInput, tenantId: string): Promise<VehicleImage> {
    // Verify vehicle exists and belongs to tenant
    const vehicle = await this.vehicleRepo().findOne({
      where: { id: input.vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle', input.vehicleId);
    }

    // Check image count limit
    const existingCount = await this.imageRepo().count({
      where: { vehicleId: input.vehicleId },
    });

    if (existingCount >= MAX_IMAGES_PER_VEHICLE) {
      throw new Error(`Maximum ${MAX_IMAGES_PER_VEHICLE} images allowed per vehicle`);
    }

    // If this is set as primary, unset other primary images
    if (input.isPrimary) {
      await this.imageRepo().update(
        { vehicleId: input.vehicleId, isPrimary: true },
        { isPrimary: false }
      );
    }

    // If no order specified, set to max order + 1
    let order = input.order;
    if (order === undefined) {
      const maxOrder = await this.imageRepo()
        .createQueryBuilder('image')
        .where('image.vehicleId = :vehicleId', { vehicleId: input.vehicleId })
        .select('MAX(image.order)', 'maxOrder')
        .getRawOne();
      
      order = (maxOrder?.maxOrder ?? -1) + 1;
    }

    const image = this.imageRepo().create({
      vehicle,
      vehicleId: input.vehicleId,
      url: input.url,
      alt: input.alt,
      order: order,
      isPrimary: input.isPrimary ?? false,
    });

    return this.imageRepo().save(image);
  }

  static async update(
    id: string,
    vehicleId: string,
    tenantId: string,
    input: UpdateVehicleImageInput
  ): Promise<VehicleImage> {
    const image = await this.getById(id, vehicleId, tenantId);
    if (!image) {
      throw new NotFoundError('VehicleImage', id);
    }

    // If setting as primary, unset other primary images
    if (input.isPrimary === true) {
      const otherPrimaryImages = await this.imageRepo().find({
        where: { vehicleId, isPrimary: true },
      });
      
      for (const otherImage of otherPrimaryImages) {
        if (otherImage.id !== id) {
          otherImage.isPrimary = false;
          await this.imageRepo().save(otherImage);
        }
      }
    }

    Object.assign(image, input);
    return this.imageRepo().save(image);
  }

  static async delete(id: string, vehicleId: string, tenantId: string): Promise<void> {
    const image = await this.getById(id, vehicleId, tenantId);
    if (!image) {
      throw new NotFoundError('VehicleImage', id);
    }

    await this.imageRepo().remove(image);
  }

  static async reorder(vehicleId: string, tenantId: string, imageIds: string[]): Promise<VehicleImage[]> {
    // Verify vehicle exists and belongs to tenant
    const vehicle = await this.vehicleRepo().findOne({
      where: { id: vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle', vehicleId);
    }

    const images = await this.imageRepo().find({
      where: { vehicleId },
    });

    // Update order based on provided array
    const updatePromises = imageIds.map((imageId, index) => {
      const image = images.find((img) => img.id === imageId);
      if (image) {
        image.order = index;
        return this.imageRepo().save(image);
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    return this.list(vehicleId, tenantId);
  }
}


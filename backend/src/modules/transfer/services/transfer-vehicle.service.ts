import { In, Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferVehicle, TransferVehicleType, TransferVehicleFeature } from '../entities/transfer-vehicle.entity';

export type TransferVehicleListScope = 'vip' | 'shuttle';
import { TransferVehicleImage } from '../entities/transfer-vehicle-image.entity';

export type CreateTransferVehicleInput = {
  tenantId: string;
  name: string;
  type: TransferVehicleType;
  brandId?: string; // Marka (opsiyonel)
  modelId?: string; // Model (opsiyonel)
  year?: number; // Model yılı (opsiyonel)
  passengerCapacity: number;
  luggageCapacity: number;
  hasDriver?: boolean;
  features?: TransferVehicleFeature[];
  isActive?: boolean;
  sortOrder?: number;
  /** Mobilize vb. GPS — rentacar takibi ile aynı plaka */
  trackingPlateNumber?: string | null;
};

export type UpdateTransferVehicleInput = Partial<CreateTransferVehicleInput>;

export class TransferVehicleService {
  private static vehicleRepo(): Repository<TransferVehicle> {
    return AppDataSource.getRepository(TransferVehicle);
  }

  private static imageRepo(): Repository<TransferVehicleImage> {
    return AppDataSource.getRepository(TransferVehicleImage);
  }

  static async list(tenantId: string, opts?: { scope?: TransferVehicleListScope }): Promise<TransferVehicle[]> {
    const order = { sortOrder: 'ASC' as const, createdAt: 'DESC' as const };
    const relations = ['brand', 'model', 'images'] as const;

    if (opts?.scope === 'vip') {
      return this.vehicleRepo().find({
        where: {
          tenantId,
          type: In([TransferVehicleType.VIP, TransferVehicleType.PREMIUM, TransferVehicleType.LUXURY]),
        },
        relations: [...relations],
        order,
      });
    }
    if (opts?.scope === 'shuttle') {
      return this.vehicleRepo().find({
        where: { tenantId, type: TransferVehicleType.SHUTTLE },
        relations: [...relations],
        order,
      });
    }

    return this.vehicleRepo().find({
      where: { tenantId },
      relations: [...relations],
      order,
    });
  }

  static async getById(id: string, tenantId: string): Promise<TransferVehicle | null> {
    return this.vehicleRepo().findOne({
      where: { id, tenantId },
      relations: ['brand', 'model', 'images'],
    });
  }

  static async create(input: CreateTransferVehicleInput): Promise<TransferVehicle> {
    const vehicle = this.vehicleRepo().create({
      ...input,
      hasDriver: input.hasDriver ?? true, // Default: şoförlü
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    });
    return this.vehicleRepo().save(vehicle);
  }

  static async update(id: string, tenantId: string, input: UpdateTransferVehicleInput): Promise<TransferVehicle> {
    const vehicle = await this.getById(id, tenantId);
    if (!vehicle) {
      throw new Error('Transfer vehicle not found');
    }

    Object.assign(vehicle, input);
    return this.vehicleRepo().save(vehicle);
  }

  /**
   * Upload multiple images (max 5)
   */
  static async uploadImages(
    id: string,
    tenantId: string,
    imageUrls: Array<{ url: string; isPrimary?: boolean }>
  ): Promise<TransferVehicle> {
    const vehicle = await this.getById(id, tenantId);
    if (!vehicle) {
      throw new Error('Transfer vehicle not found');
    }

    // Check current image count
    const currentImageCount = vehicle.images?.length || 0;
    const newImageCount = imageUrls.length;
    
    if (currentImageCount + newImageCount > 5) {
      throw new Error(`Maximum 5 images allowed. Current: ${currentImageCount}, Trying to add: ${newImageCount}`);
    }

    // Create new images
    const images = imageUrls.map((img, index) =>
      this.imageRepo().create({
        vehicleId: vehicle.id,
        imageUrl: img.url,
        sortOrder: currentImageCount + index,
        isPrimary: img.isPrimary || false,
      })
    );

    await this.imageRepo().save(images);

    // Reload vehicle with images
    return this.getById(id, tenantId) as Promise<TransferVehicle>;
  }

  /**
   * Delete an image
   */
  static async deleteImage(vehicleId: string, imageId: string, tenantId: string): Promise<void> {
    const vehicle = await this.getById(vehicleId, tenantId);
    if (!vehicle) {
      throw new Error('Transfer vehicle not found');
    }

    await this.imageRepo().delete({ id: imageId, vehicleId });
  }

  /**
   * Set primary image
   */
  static async setPrimaryImage(vehicleId: string, imageId: string, tenantId: string): Promise<TransferVehicle> {
    const vehicle = await this.getById(vehicleId, tenantId);
    if (!vehicle) {
      throw new Error('Transfer vehicle not found');
    }

    // Remove primary flag from all images
    await this.imageRepo().update({ vehicleId }, { isPrimary: false });

    // Set new primary
    await this.imageRepo().update({ id: imageId, vehicleId }, { isPrimary: true });

    return this.getById(vehicleId, tenantId) as Promise<TransferVehicle>;
  }

  /**
   * Reorder images
   */
  static async reorderImages(
    vehicleId: string,
    tenantId: string,
    imageOrders: Array<{ imageId: string; sortOrder: number }>
  ): Promise<TransferVehicle> {
    const vehicle = await this.getById(vehicleId, tenantId);
    if (!vehicle) {
      throw new Error('Transfer vehicle not found');
    }

    for (const order of imageOrders) {
      await this.imageRepo().update(
        { id: order.imageId, vehicleId },
        { sortOrder: order.sortOrder }
      );
    }

    return this.getById(vehicleId, tenantId) as Promise<TransferVehicle>;
  }

  static async delete(id: string, tenantId: string): Promise<void> {
    const vehicle = await this.getById(id, tenantId);
    if (!vehicle) {
      throw new Error('Transfer vehicle not found');
    }
    await this.vehicleRepo().remove(vehicle);
  }
}


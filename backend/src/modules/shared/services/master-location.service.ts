import { Repository, IsNull, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { MasterLocation, MasterLocationType } from '../entities/master-location.entity';

// Module-level cache for the full master location hierarchy (all tenants share the same data).
// TTL: 5 minutes. Invalidated on create/update/remove.
const MASTER_LOCATIONS_CACHE_TTL_MS = 5 * 60 * 1000;
let masterLocationsCache: { data: MasterLocationDto[]; expiresAt: number } | null = null;

export type CreateMasterLocationInput = {
  name: string;
  parentId?: string | null;
  type?: MasterLocationType;
};

export type UpdateMasterLocationInput = Partial<CreateMasterLocationInput>;

export type MasterLocationDto = Omit<MasterLocation, 'children'> & {
  children?: MasterLocationDto[];
};

export class MasterLocationService {
  private static repo(): Repository<MasterLocation> {
    return AppDataSource.getRepository(MasterLocation);
  }

  static async list(parentId?: string | null): Promise<MasterLocationDto[]> {
    try {
      const isTopLevel =
        parentId === undefined || parentId === null || parentId === '' || parentId === 'null';

      if (isTopLevel) {
        // Return from in-memory cache when available and not expired
        if (masterLocationsCache && masterLocationsCache.expiresAt > Date.now()) {
          return masterLocationsCache.data;
        }

        // Get top-level locations with their children (2 queries total)
        const topLevelLocations = await this.repo().find({
          where: { parentId: IsNull() },
          relations: ['parent'],
          order: { createdAt: 'DESC' },
        });

        if (topLevelLocations.length === 0) {
          return [];
        }

        const topLevelIds = topLevelLocations.map(loc => loc.id);
        const children = await this.repo().find({
          where: { parentId: In(topLevelIds) },
          relations: ['parent'],
          order: { createdAt: 'DESC' },
        });

        const childrenByParent = new Map<string, MasterLocationDto[]>();
        children.forEach(child => {
          const parentKey = child.parentId || '';
          if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
          childrenByParent.get(parentKey)!.push(this.mapToDto(child, []));
        });

        const result = topLevelLocations.map(location => {
          const dto = this.mapToDto(location, []);
          dto.children = childrenByParent.get(location.id) || [];
          dto.parent = null;
          return dto;
        });

        // Store in cache
        masterLocationsCache = { data: result, expiresAt: Date.now() + MASTER_LOCATIONS_CACHE_TTL_MS };
        return result;
      }

      // Filtered by specific parentId — no cache for partial lists
      const locations = await this.repo().find({
        where: { parentId },
        relations: ['parent'],
        order: { createdAt: 'DESC' },
      });
      return locations.map(location => this.mapToDto(location, []));
    } catch (error) {
      console.error('Error in MasterLocationService.list:', error);
      throw error;
    }
  }

  private static invalidateCache(): void {
    masterLocationsCache = null;
  }

  private static mapToDto(location: MasterLocation, children: MasterLocationDto[] = []): MasterLocationDto {
    return {
      id: location.id,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      name: location.name,
      parentId: location.parentId,
      parent: location.parent ? {
        id: location.parent.id,
        createdAt: location.parent.createdAt,
        updatedAt: location.parent.updatedAt,
        name: location.parent.name,
        parentId: location.parent.parentId,
        type: location.parent.type,
        children: [],
      } : null,
      type: location.type,
      children: children,
    };
  }

  static async getById(id: string): Promise<MasterLocationDto | null> {
    try {
      const location = await this.repo().findOne({
        where: { id },
        relations: ['parent'],
      });

      if (!location) {
        return null;
      }

      const children = await this.repo().find({
        where: { parentId: id },
        relations: ['parent'],
        order: { createdAt: 'DESC' },
      });

      return this.mapToDto(
        location,
        children.map(child => this.mapToDto(child, []))
      );
    } catch (error) {
      console.error('Error in MasterLocationService.getById:', error);
      throw error;
    }
  }

  static async create(input: CreateMasterLocationInput): Promise<MasterLocationDto> {
    const { name, parentId, type } = input;

    if (!name || name.trim().length === 0) {
      throw new Error('Location name is required');
    }

    let parent: MasterLocation | null = null;
    if (parentId) {
      parent = await this.repo().findOne({ where: { id: parentId } });
      if (!parent) {
        throw new Error('Parent location not found');
      }
    }

    const location = this.repo().create({
      name: name.trim(),
      parent: parent,
      parentId: parentId || null,
      type: type || MasterLocationType.MERKEZ,
    });

    const savedLocation = await this.repo().save(location);
    this.invalidateCache();
    return this.mapToDto(savedLocation, []);
  }

  static async update(id: string, input: UpdateMasterLocationInput): Promise<MasterLocationDto> {
    const location = await this.repo().findOne({ where: { id } });
    if (!location) {
      throw new Error('Location not found');
    }

    if (input.name !== undefined) location.name = input.name.trim();
    if (input.type !== undefined) location.type = input.type;

    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        location.parent = null;
        location.parentId = null;
      } else {
        if (input.parentId === id) {
          throw new Error('Location cannot be its own parent');
        }
        const parent = await this.repo().findOne({ where: { id: input.parentId } });
        if (!parent) {
          throw new Error('Parent location not found');
        }
        location.parent = parent;
        location.parentId = input.parentId;
      }
    }

    const savedLocation = await this.repo().save(location);
    const reloadedLocation = await this.repo().findOne({
      where: { id: savedLocation.id },
      relations: ['parent'],
    });

    if (!reloadedLocation) {
      throw new Error('Failed to reload location');
    }

    this.invalidateCache();
    return this.mapToDto(reloadedLocation, []);
  }

  static async remove(id: string): Promise<void> {
    const location = await this.repo().findOne({ where: { id } });
    if (!location) {
      throw new Error('Location not found');
    }

    const children = await this.repo().find({
      where: { parentId: id },
    });

    if (children.length > 0) {
      throw new Error(
        `This location cannot be deleted because it has ${children.length} child locations. Please delete child locations first.`
      );
    }

    await this.repo().remove(location);
    this.invalidateCache();
  }
}


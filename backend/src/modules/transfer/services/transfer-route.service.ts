import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferRoute } from '../entities/transfer-route.entity';

/**
 * TransferRouteService - Read-only service
 * Route creation/update/deletion has been disabled.
 * Routes should be managed directly in the database or via migrations.
 */
export class TransferRouteService {
  private static routeRepo(): Repository<TransferRoute> {
    return AppDataSource.getRepository(TransferRoute);
  }

  /**
   * Get all routes for a tenant
   */
  static async list(tenantId: string): Promise<TransferRoute[]> {
    return this.routeRepo().find({
      where: { tenantId },
      relations: ['points'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Get a specific route by ID
   */
  static async getById(id: string, tenantId: string): Promise<TransferRoute | null> {
    return this.routeRepo().findOne({
      where: { id, tenantId },
      relations: ['points'],
    });
  }
}


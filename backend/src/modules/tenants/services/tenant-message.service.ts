import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TenantMessage, TenantMessageType } from '../entities/tenant-message.entity';

export type CreateTenantMessageInput = {
  tenantId: string;
  title: string;
  message: string;
  type?: TenantMessageType;
  createdById?: string;
};

export type UpdateTenantMessageInput = {
  title?: string;
  message?: string;
  type?: TenantMessageType;
  isRead?: boolean;
};

export class TenantMessageService {
  private static repository(): Repository<TenantMessage> {
    return AppDataSource.getRepository(TenantMessage);
  }

  static async list(tenantId: string): Promise<TenantMessage[]> {
    return this.repository().find({
      where: { tenantId },
      relations: ['tenant', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<TenantMessage | null> {
    return this.repository().findOne({
      where: { id, tenantId },
      relations: ['tenant', 'createdBy'],
    });
  }

  static async create(input: CreateTenantMessageInput): Promise<TenantMessage> {
    const repo = this.repository();

    const message = repo.create({
      tenantId: input.tenantId,
      title: input.title,
      message: input.message,
      type: input.type ?? TenantMessageType.MESSAGE,
      createdById: input.createdById ?? null,
      isRead: false,
    });

    return repo.save(message);
  }

  static async update(id: string, tenantId: string, input: UpdateTenantMessageInput): Promise<TenantMessage> {
    const repo = this.repository();
    const message = await repo.findOne({ where: { id, tenantId } });

    if (!message) {
      throw new Error('Mesaj bulunamadı');
    }

    Object.assign(message, {
      title: input.title ?? message.title,
      message: input.message ?? message.message,
      type: input.type ?? message.type,
      isRead: input.isRead ?? message.isRead,
      readAt: input.isRead && !message.isRead ? new Date() : message.readAt,
    });

    return repo.save(message);
  }

  static async delete(id: string, tenantId: string): Promise<void> {
    const repo = this.repository();
    const message = await repo.findOne({ where: { id, tenantId } });

    if (!message) {
      throw new Error('Mesaj bulunamadı');
    }

    await repo.remove(message);
  }

  static async markAsRead(id: string, tenantId: string): Promise<TenantMessage> {
    return this.update(id, tenantId, { isRead: true });
  }
}


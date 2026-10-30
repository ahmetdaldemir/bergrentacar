import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { ChatRoom, ChatRoomStatus } from '../entities/chat-room.entity';
import { ChatParticipant, ParticipantType } from '../entities/chat-participant.entity';
import { NotFoundError } from '../../../utils/errors';

export type CreateChatRoomInput = {
  tenantId: string;
  title: string;
  visitorId?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  metadata?: Record<string, any>;
};

export type UpdateChatRoomInput = {
  title?: string;
  status?: ChatRoomStatus;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  metadata?: Record<string, any>;
};

export class ChatRoomService {
  private static roomRepo(): Repository<ChatRoom> {
    return AppDataSource.getRepository(ChatRoom);
  }

  private static participantRepo(): Repository<ChatParticipant> {
    return AppDataSource.getRepository(ChatParticipant);
  }

  /**
   * Create a new chat room
   */
  static async create(input: CreateChatRoomInput): Promise<ChatRoom> {
    const room = this.roomRepo().create({
      tenantId: input.tenantId,
      title: input.title,
      visitorId: input.visitorId,
      visitorName: input.visitorName,
      visitorEmail: input.visitorEmail,
      visitorPhone: input.visitorPhone,
      status: ChatRoomStatus.ACTIVE,
      metadata: input.metadata,
      unreadCount: 0,
    });

    const savedRoom = await this.roomRepo().save(room);

    // Create visitor participant
    if (input.visitorId) {
      const visitorParticipant = this.participantRepo().create({
        roomId: savedRoom.id,
        participantType: ParticipantType.VISITOR,
        visitorId: input.visitorId,
        isOnline: true,
        unreadCount: 0,
      });
      await this.participantRepo().save(visitorParticipant);
    }

    return savedRoom;
  }

  /**
   * Get room by ID
   */
  static async getById(id: string, tenantId: string): Promise<ChatRoom | null> {
    return this.roomRepo().findOne({
      where: { id, tenantId },
      relations: ['messages', 'participants', 'participants.user'],
      order: {
        messages: {
          createdAt: 'ASC',
        },
      },
    });
  }

  /**
   * List rooms for tenant
   */
  static async list(
    tenantId: string,
    filters?: {
      status?: ChatRoomStatus;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ rooms: ChatRoom[]; total: number }> {
    const queryBuilder = this.roomRepo()
      .createQueryBuilder('room')
      .where('room.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('room.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .orderBy('room.lastMessageAt', 'DESC')
      .addOrderBy('room.createdAt', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('room.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(room.title ILIKE :search OR room.visitorEmail ILIKE :search OR room.visitorName ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const total = await queryBuilder.getCount();

    if (filters?.limit) {
      queryBuilder.limit(filters.limit);
    }
    if (filters?.offset) {
      queryBuilder.offset(filters.offset);
    }

    const rooms = await queryBuilder.getMany();

    return { rooms, total };
  }

  /**
   * Update room
   */
  static async update(id: string, tenantId: string, input: UpdateChatRoomInput): Promise<ChatRoom> {
    const room = await this.getById(id, tenantId);
    if (!room) {
      throw new NotFoundError('Chat room', id);
    }

    Object.assign(room, input);
    return this.roomRepo().save(room);
  }

  /**
   * Add admin participant to room
   */
  static async addAdminParticipant(roomId: string, userId: string): Promise<ChatParticipant> {
    const existing = await this.participantRepo().findOne({
      where: {
        roomId,
        userId,
        participantType: ParticipantType.ADMIN,
      },
    });

    if (existing) {
      existing.isOnline = true;
      return this.participantRepo().save(existing);
    }

    const participant = this.participantRepo().create({
      roomId,
      userId,
      participantType: ParticipantType.ADMIN,
      isOnline: true,
      unreadCount: 0,
    });

    return this.participantRepo().save(participant);
  }

  /**
   * Update room last message timestamp
   */
  static async updateLastMessageAt(roomId: string): Promise<void> {
    await this.roomRepo().update(roomId, {
      lastMessageAt: new Date(),
    });
  }

  /**
   * Increment unread count for admin
   */
  static async incrementUnreadCount(roomId: string): Promise<void> {
    const room = await this.roomRepo().findOne({ where: { id: roomId } });
    if (room) {
      room.unreadCount += 1;
      await this.roomRepo().save(room);
    }
  }

  /**
   * Mark room as read (reset unread count)
   */
  static async markAsRead(roomId: string, tenantId: string): Promise<void> {
    const room = await this.getById(roomId, tenantId);
    if (room) {
      room.unreadCount = 0;
      await this.roomRepo().save(room);
    }
  }

  /**
   * Create or get existing room for visitor
   * If visitor already has an active room, return it; otherwise create a new one
   */
  static async createOrGetVisitorRoom(input: {
    tenantId: string;
    visitorId: string;
    visitorName?: string;
    visitorEmail?: string;
    visitorPhone?: string;
  }): Promise<ChatRoom> {
    // Try to find existing active room for this visitor
    const existingRoom = await this.roomRepo().findOne({
      where: {
        tenantId: input.tenantId,
        visitorId: input.visitorId,
        status: ChatRoomStatus.ACTIVE,
      },
      order: {
        lastMessageAt: 'DESC',
        createdAt: 'DESC',
      },
    });

    if (existingRoom) {
      // Update visitor info if provided
      if (input.visitorName || input.visitorEmail || input.visitorPhone) {
        if (input.visitorName) existingRoom.visitorName = input.visitorName;
        if (input.visitorEmail) existingRoom.visitorEmail = input.visitorEmail;
        if (input.visitorPhone) existingRoom.visitorPhone = input.visitorPhone;
        await this.roomRepo().save(existingRoom);
      }
      return existingRoom;
    }

    // Create new room
    const title = input.visitorName || input.visitorEmail || 'Yeni Ziyaretçi';
    return this.create({
      tenantId: input.tenantId,
      title,
      visitorId: input.visitorId,
      visitorName: input.visitorName,
      visitorEmail: input.visitorEmail,
      visitorPhone: input.visitorPhone,
    });
  }
}


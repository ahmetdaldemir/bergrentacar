import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { ChatMessage, ChatMessageType, ChatMessageSenderType } from '../entities/chat-message.entity';
import { ChatRoomService } from './chat-room.service';
import { NotFoundError } from '../../../utils/errors';

export type CreateChatMessageInput = {
  roomId: string;
  senderType: ChatMessageSenderType;
  adminUserId?: string;
  messageType?: ChatMessageType;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
};

export class ChatMessageService {
  private static messageRepo(): Repository<ChatMessage> {
    return AppDataSource.getRepository(ChatMessage);
  }

  /**
   * Create a new message
   */
  static async create(input: CreateChatMessageInput): Promise<ChatMessage> {
    const message = this.messageRepo().create({
      roomId: input.roomId,
      senderType: input.senderType,
      adminUserId: input.adminUserId,
      messageType: input.messageType || ChatMessageType.TEXT,
      content: input.content,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileSize: input.fileSize,
      metadata: input.metadata,
      isRead: false,
    });

    const savedMessage = await this.messageRepo().save(message);

    // Update room last message timestamp
    await ChatRoomService.updateLastMessageAt(input.roomId);

    // If message is from visitor, increment unread count for admin
    if (input.senderType === ChatMessageSenderType.VISITOR) {
      await ChatRoomService.incrementUnreadCount(input.roomId);
    } else if (input.senderType === ChatMessageSenderType.ADMIN) {
      // If message is from admin, mark as read for visitor
      savedMessage.isRead = true;
      savedMessage.readAt = new Date();
      await this.messageRepo().save(savedMessage);
    }

    return savedMessage;
  }

  /**
   * Get messages for a room
   */
  static async getByRoomId(
    roomId: string,
    tenantId: string,
    filters?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ChatMessage[]> {
    // Verify room belongs to tenant
    const room = await ChatRoomService.getById(roomId, tenantId);
    if (!room) {
      throw new NotFoundError('Chat room', roomId);
    }

    const queryBuilder = this.messageRepo()
      .createQueryBuilder('message')
      .where('message.roomId = :roomId', { roomId })
      .leftJoinAndSelect('message.adminUser', 'adminUser')
      .orderBy('message.createdAt', 'ASC');

    if (filters?.limit) {
      queryBuilder.limit(filters.limit);
    }
    if (filters?.offset) {
      queryBuilder.offset(filters.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Mark message as read
   */
  static async markAsRead(messageId: string, roomId: string, tenantId: string): Promise<ChatMessage> {
    // Verify room belongs to tenant
    const room = await ChatRoomService.getById(roomId, tenantId);
    if (!room) {
      throw new NotFoundError('Chat room', roomId);
    }

    const message = await this.messageRepo().findOne({
      where: { id: messageId, roomId },
    });

    if (!message) {
      throw new NotFoundError('Chat message', messageId);
    }

    message.isRead = true;
    message.readAt = new Date();
    return this.messageRepo().save(message);
  }

  /**
   * Mark all messages in room as read
   */
  static async markAllAsRead(roomId: string, tenantId: string): Promise<void> {
    // Verify room belongs to tenant
    const room = await ChatRoomService.getById(roomId, tenantId);
    if (!room) {
      throw new NotFoundError('Chat room', roomId);
    }

    await this.messageRepo().update(
      {
        roomId,
        isRead: false,
        senderType: ChatMessageSenderType.VISITOR,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    // Reset room unread count
    await ChatRoomService.markAsRead(roomId, tenantId);
  }
}


import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { ChatRoom } from './chat-room.entity';
import { TenantUser } from '../../tenants/entities/tenant-user.entity';

export enum ChatMessageType {
  TEXT = 'text',
  FILE = 'file',
  SYSTEM = 'system',
}

export enum ChatMessageSenderType {
  ADMIN = 'admin',
  VISITOR = 'visitor',
  SYSTEM = 'system',
}

@Entity({ name: 'chat_messages' })
export class ChatMessage extends BaseEntity {
  @ManyToOne(() => ChatRoom, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: ChatRoom;

  @Column({ name: 'room_id' })
  roomId!: string;

  @Column({ type: 'enum', enum: ChatMessageSenderType })
  senderType!: ChatMessageSenderType; // admin, visitor, system

  @ManyToOne(() => TenantUser, { nullable: true })
  @JoinColumn({ name: 'admin_user_id' })
  adminUser?: TenantUser | null;

  @Column({ name: 'admin_user_id', nullable: true })
  adminUserId?: string | null;

  @Column({ type: 'enum', enum: ChatMessageType, default: ChatMessageType.TEXT })
  messageType!: ChatMessageType;

  @Column({ type: 'text' })
  content!: string; // Message text or file URL

  @Column({ name: 'file_url', length: 500, nullable: true })
  fileUrl?: string;

  @Column({ name: 'file_name', length: 200, nullable: true })
  fileName?: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number;

  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // Additional data
}


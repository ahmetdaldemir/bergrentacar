import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatParticipant } from './chat-participant.entity';

export enum ChatRoomStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

@Entity({ name: 'chat_rooms' })
export class ChatRoom extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ length: 200 })
  title!: string; // Visitor name or subject

  @Column({ type: 'enum', enum: ChatRoomStatus, default: ChatRoomStatus.ACTIVE })
  status!: ChatRoomStatus;

  @Column({ name: 'visitor_id', nullable: true })
  visitorId?: string; // Unique visitor identifier (browser fingerprint, session, etc.)

  @Column({ name: 'visitor_name', length: 120, nullable: true })
  visitorName?: string;

  @Column({ name: 'visitor_email', length: 160, nullable: true })
  visitorEmail?: string;

  @Column({ name: 'visitor_phone', length: 32, nullable: true })
  visitorPhone?: string;

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ name: 'unread_count', type: 'int', default: 0 })
  unreadCount!: number; // Unread messages count for admin

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // Additional data (IP, user agent, page URL, etc.)

  @OneToMany(() => ChatMessage, (message) => message.room, { cascade: true })
  messages!: ChatMessage[];

  @OneToMany(() => ChatParticipant, (participant) => participant.room, { cascade: true })
  participants!: ChatParticipant[];
}


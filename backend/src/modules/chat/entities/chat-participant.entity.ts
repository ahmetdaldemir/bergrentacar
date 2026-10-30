import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { ChatRoom } from './chat-room.entity';
import { TenantUser } from '../../tenants/entities/tenant-user.entity';

export enum ParticipantType {
  ADMIN = 'admin',
  VISITOR = 'visitor',
}

@Entity({ name: 'chat_participants' })
@Unique(['roomId', 'userId', 'participantType'])
@Unique(['roomId', 'visitorId', 'participantType'])
export class ChatParticipant extends BaseEntity {
  @ManyToOne(() => ChatRoom, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: ChatRoom;

  @Column({ name: 'room_id' })
  roomId!: string;

  @Column({ type: 'enum', enum: ParticipantType })
  participantType!: ParticipantType;

  @ManyToOne(() => TenantUser, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: TenantUser | null;

  @Column({ name: 'user_id', nullable: true })
  userId?: string | null;

  @Column({ name: 'visitor_id', nullable: true })
  visitorId?: string; // For visitor participants

  @Column({ name: 'is_online', default: false })
  isOnline!: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt?: Date;

  @Column({ name: 'unread_count', type: 'int', default: 0 })
  unreadCount!: number;
}


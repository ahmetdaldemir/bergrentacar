import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';

@Entity({ name: 'admin_users' })
export class AdminUser extends BaseEntity {
  @Column({ type: 'varchar', length: 200, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 500 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email?: string;

  @Column({ default: true })
  isActive!: boolean;
}


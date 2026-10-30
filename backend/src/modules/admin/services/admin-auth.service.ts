import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { loadEnv } from '../../../config/env';
import { AdminUser } from '../entities/admin-user.entity';
import type { TenantUserRole } from '../../tenants/entities/tenant-user.entity';

const env = loadEnv();

// Fixed admin credentials
const ADMIN_USERNAME = 'privates';
const ADMIN_PASSWORD = 'emiladesoza1987';

export type AdminLoginInput = {
  username: string;
  password: string;
};

export type AdminTokenPayload = {
  sub: string;
  type: 'admin';
  /** Platform admin JWT'de yok; tenant payload ile union'da güvenli erişim için */
  tenantId?: string;
  role?: TenantUserRole;
};

export class AdminAuthService {
  private static userRepo(): Repository<AdminUser> {
    return AppDataSource.getRepository(AdminUser);
  }

  /**
   * Initialize admin user if it doesn't exist
   */
  static async ensureAdminUser(): Promise<AdminUser> {
    const repo = this.userRepo();
    let admin = await repo.findOne({ where: { username: ADMIN_USERNAME } });

    if (!admin) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      admin = repo.create({
        username: ADMIN_USERNAME,
        passwordHash,
        name: 'System Admin',
        isActive: true,
      });
      admin = await repo.save(admin);
    }

    return admin;
  }

  static async validateCredentials({ username, password }: AdminLoginInput): Promise<AdminUser | null> {
    // Check fixed credentials first
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return await this.ensureAdminUser();
    }

    // Check database users
    const user = await this.userRepo().findOne({ where: { username, isActive: true } });
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  static createToken(user: AdminUser): string {
    const payload: AdminTokenPayload = {
      sub: user.id,
      type: 'admin',
    };

    const options: SignOptions = {
      expiresIn: env.auth.tokenExpiresIn as unknown as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, env.auth.jwtSecret as Secret, options);
  }

  static async login(input: AdminLoginInput) {
    const user = await this.validateCredentials(input);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const token = this.createToken(user);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        type: 'admin' as const,
      },
    };
  }

  static async getProfile(userId: string) {
    const user = await this.userRepo().findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Admin user not found');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        type: 'admin' as const,
      },
    };
  }
}


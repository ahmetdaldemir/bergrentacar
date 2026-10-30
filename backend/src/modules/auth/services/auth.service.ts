import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { loadEnv } from '../../../config/env';
import { TenantUser, TenantUserRole } from '../../tenants/entities/tenant-user.entity';
import { Tenant, TenantCategory } from '../../tenants/entities/tenant.entity';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../utils/errors';
import { SITE_TENANT_ID } from '../../../security/bergrentacar-site';

const env = loadEnv();

export type RegisterInput = {
  tenantId: string;
  name: string;
  email: string;
  password: string;
  role?: TenantUserRole;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  tenantName: string;
  tenantCategory: TenantCategory;
  tenantDefaultLanguage?: string;
  supportEmail?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export type AuthTokenPayload = {
  sub: string;
  tenantId: string;
  role: TenantUserRole;
};

export class AuthService {
  private static userRepo(): Repository<TenantUser> {
    return AppDataSource.getRepository(TenantUser);
  }

  static async register(input: RegisterInput): Promise<TenantUser> {
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const existing = await this.userRepo().findOne({ where: { email: input.email } });
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = this.userRepo().create({
      tenant,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role ?? TenantUserRole.ADMIN,
    });

    return this.userRepo().save(user);
  }

  static async validateCredentials({ email, password }: LoginInput): Promise<TenantUser | null> {
    const user = await this.userRepo().findOne({ where: { email, tenantId: SITE_TENANT_ID } });
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  static createToken(user: TenantUser): string {
    const payload: AuthTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const options: SignOptions = {};
    options.expiresIn = env.auth.tokenExpiresIn as unknown as SignOptions['expiresIn'];

    return jwt.sign(payload, env.auth.jwtSecret as Secret, options);
  }

  static async login(input: LoginInput) {
    const user = await this.validateCredentials(input);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.userRepo().save(user);

    const token = this.createToken(user);

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ 
      where: { id: user.tenantId },
      relations: ['defaultCurrency'],
    });

    // Get tenant settings
    const siteSettings = await TenantSettingsService.getSiteSettings(user.tenantId);
    let mailSettings = await TenantSettingsService.getMailSettings(user.tenantId);
    const paymentSettings = await TenantSettingsService.getPaymentSettings(user.tenantId);

    // Mask password in mail settings
    if (mailSettings && mailSettings.smtpPassword) {
      mailSettings = { ...mailSettings, smtpPassword: '***' };
    }

    const settings = {
      site: siteSettings || null,
      mail: mailSettings || null,
      payment: paymentSettings || null,
    };

    return {
      token,
      user,
      tenant,
      settings,
    };
  }

  private static async generateTenantSlug(base: string): Promise<string> {
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const slugBase = base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = slugBase || 'tenant';
    let counter = 1;

    while (await tenantRepo.findOne({ where: { slug } })) {
      slug = `${slugBase}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  static async signup(input: SignupInput) {
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const userRepo = AppDataSource.getRepository(TenantUser);

    const existingUser = await userRepo.findOne({ where: { email: input.adminEmail } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const slug = await this.generateTenantSlug(input.tenantName);

    const tenant = tenantRepo.create({
      name: input.tenantName,
      slug,
      category: input.tenantCategory,
      defaultLanguage: input.tenantDefaultLanguage ?? 'en',
      supportEmail: input.supportEmail,
    });

    const createdTenant = await tenantRepo.save(tenant);

    // Initialize tenant languages (all system active languages as inactive)
    const { TenantLanguageService } = await import('../../tenants/services/tenant-language.service');
    try {
      await TenantLanguageService.initializeFromActiveLanguages(createdTenant.id, false);
    } catch (error) {
      // Log error but don't fail tenant creation
      console.error('Failed to initialize tenant languages:', error);
    }

    const passwordHash = await bcrypt.hash(input.adminPassword, 10);

    const user = userRepo.create({
      tenant: createdTenant,
      name: input.adminName,
      email: input.adminEmail,
      passwordHash,
      role: TenantUserRole.ADMIN,
    });

    const createdUser = await userRepo.save(user);
    const token = this.createToken(createdUser);

    return {
      token,
      user: createdUser,
      tenant: createdTenant,
    };
  }

  static async getProfile(userId: string) {
    const user = await this.userRepo().findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ 
      where: { id: user.tenantId },
      relations: ['defaultCurrency'],
    });

    // Get tenant settings
    const siteSettings = await TenantSettingsService.getSiteSettings(user.tenantId);
    let mailSettings = await TenantSettingsService.getMailSettings(user.tenantId);
    const paymentSettings = await TenantSettingsService.getPaymentSettings(user.tenantId);

    // Mask password in mail settings
    if (mailSettings && mailSettings.smtpPassword) {
      mailSettings = { ...mailSettings, smtpPassword: '***' };
    }

    const settings = {
      site: siteSettings || null,
      mail: mailSettings || null,
      payment: paymentSettings || null,
    };

    return { user, tenant, settings };
  }

  static async updateDashboardLayout(userId: string, tenantId: string, body: unknown): Promise<TenantUser> {
    const user = await this.userRepo().findOne({ where: { id: userId, tenantId } });
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    const parsed = AuthService.parseDashboardLayoutBody(body);
    user.dashboardLayout = parsed;
    return this.userRepo().save(user);
  }

  private static parseDashboardLayoutBody(body: unknown): Record<string, unknown> | null {
    if (body == null) return null;
    if (typeof body !== 'object') throw new ValidationError('Geçersiz dashboard layout');
    const widgetsRaw = (body as { widgets?: unknown }).widgets;
    if (!Array.isArray(widgetsRaw)) throw new ValidationError('widgets dizisi gerekli');

    const allowed = new Set([
      'kpi',
      'currencies',
      'calendar',
      'map',
      'operations',
      'financial',
      'alerts',
      'reminders',
      'paymentReminders',
      'maintenance',
    ]);

    const widgets = widgetsRaw.map((item: unknown, index: number) => {
      const row = item as { id?: string; enabled?: boolean; cols?: unknown; order?: unknown };
      if (!row || typeof row.id !== 'string' || !allowed.has(row.id)) {
        throw new ValidationError(`Geçersiz widget: indeks ${index}`);
      }
      const cols = Number(row.cols);
      const order = Number(row.order);
      if (!Number.isFinite(cols) || cols < 1 || cols > 12) {
        throw new ValidationError(`cols 1–12 olmalı (${row.id})`);
      }
      if (!Number.isFinite(order)) {
        throw new ValidationError(`order sayı olmalı (${row.id})`);
      }
      return {
        id: row.id,
        enabled: row.enabled !== false,
        cols: Math.round(cols),
        order: Math.round(order),
      };
    });

    return { widgets };
  }
}

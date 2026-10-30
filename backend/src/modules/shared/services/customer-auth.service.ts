import { Brackets, Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Customer } from '../entities/customer.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CustomerWallet } from '../entities/customer-wallet.entity';
import { Reservation } from '../entities/reservation.entity';
import { TransferReservation } from '../../transfer/entities/transfer-reservation.entity';
import { normalizePhoneLastDigits } from '../../../utils/phone-match';
import * as bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { loadEnv } from '../../../config/env';
import crypto from 'crypto';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../utils/errors';

const env = loadEnv();

export interface CustomerLoginInput {
  tenantId: string;
  email?: string;
  idNumber?: string;
  password: string;
}

export interface CustomerLoginResult {
  token: string;
  customer: Customer;
  tenant: Tenant;
}

export interface CustomerProfileResult {
  customer: Customer;
  tenant: Tenant;
  wallet: CustomerWallet | null;
}

export type CustomerReservationsResult = {
  /** Tur / rentacar `reservations` tablosu */
  reservations: Reservation[];
  /** Transfer rezervasyonları (aynı e-posta veya aynı telefon son 10 hane) */
  transferReservations: TransferReservation[];
};

export class CustomerAuthService {
  private static customerRepository(): Repository<Customer> {
    return AppDataSource.getRepository(Customer);
  }

  private static tenantRepository(): Repository<Tenant> {
    return AppDataSource.getRepository(Tenant);
  }

  private static walletRepository(): Repository<CustomerWallet> {
    return AppDataSource.getRepository(CustomerWallet);
  }

  private static reservationRepository(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  private static transferReservationRepository(): Repository<TransferReservation> {
    return AppDataSource.getRepository(TransferReservation);
  }

  /**
   * Customer Login
   * Login with email or idNumber + password
   */
  static async login(input: CustomerLoginInput): Promise<CustomerLoginResult> {
    const repo = this.customerRepository();

    let customer: Customer | null = null;
    if (input.email) {
      customer = await repo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.language', 'language')
        .where('c.tenant_id = :tenantId', { tenantId: input.tenantId })
        .andWhere('LOWER(TRIM(c.email)) = :email', {
          email: input.email.trim().toLowerCase(),
        })
        .getOne();
    } else if (input.idNumber) {
      customer = await repo.findOne({
        where: { tenantId: input.tenantId, idNumber: input.idNumber },
        relations: ['language'],
      });
    } else {
      throw new ValidationError('Email or ID number is required');
    }

    if (!customer) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if customer is active
    if (!customer.isActive) {
      throw new ForbiddenError('Account is inactive. Please contact support.');
    }

    // Check if customer is blacklisted
    if (customer.isBlacklisted) {
      throw new ForbiddenError('Account is restricted. Please contact support.');
    }

    // Verify password
    if (!customer.passwordHash) {
      throw new UnauthorizedError('Password not set for this account. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, customer.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Get tenant
    const tenant = await this.tenantRepository().findOneBy({ id: input.tenantId });
    if (!tenant) {
      throw new NotFoundError('Tenant', input.tenantId);
    }

    // Generate JWT token
    const payload = {
      sub: customer.id,
      customerId: customer.id,
      tenantId: customer.tenantId,
      type: 'customer',
      email: customer.email,
      fullName: customer.fullName,
    };

    const options: SignOptions = {};
    options.expiresIn = env.auth.tokenExpiresIn as unknown as SignOptions['expiresIn'];

    const token = jwt.sign(payload, env.auth.jwtSecret as Secret, options);

    return {
      token,
      customer,
      tenant,
    };
  }

  /**
   * Get Customer Profile
   */
  static async getProfile(customerId: string, tenantId: string): Promise<CustomerProfileResult> {
    const customer = await this.customerRepository().findOne({
      where: { id: customerId, tenantId },
      relations: ['language'],
    });

    if (!customer) {
      throw new NotFoundError('Customer', customerId);
    }

    const tenant = await this.tenantRepository().findOneBy({ id: tenantId });
    if (!tenant) {
      throw new NotFoundError('Tenant', tenantId);
    }

    // Get wallet (if exists)
    const wallet = await this.walletRepository().findOne({
      where: { customerId, tenantId },
    });

    return {
      customer,
      tenant,
      wallet,
    };
  }

  /**
   * Müşteri rezervasyonları: tur/rentacar + transfer.
   * Eşleşme: aynı tenant’ta e-posta (büyük/küçük harf yok sayılır) VEYA telefon son 10 hane.
   */
  static async getCustomerReservations(
    customerId: string,
    tenantId: string
  ): Promise<CustomerReservationsResult> {
    const empty: CustomerReservationsResult = { reservations: [], transferReservations: [] };
    const customer = await this.customerRepository().findOne({
      where: { id: customerId, tenantId },
    });
    if (!customer) return empty;

    const emailNorm = customer.email?.trim().toLowerCase() || null;
    const phoneNorm =
      normalizePhoneLastDigits(customer.mobilePhone) ||
      normalizePhoneLastDigits(customer.homePhone);
    if (!emailNorm && !phoneNorm) return empty;

    const phoneExpr = (alias: string) =>
      `RIGHT(REGEXP_REPLACE(COALESCE(${alias}.customer_phone, ''), '[^0-9]', '', 'g'), 10)`;
    const transferPhoneExpr = (alias: string) =>
      `RIGHT(REGEXP_REPLACE(COALESCE(${alias}.passenger_phone, ''), '[^0-9]', '', 'g'), 10)`;

    const resQb = this.reservationRepository()
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere(
        new Brackets((qb) => {
          if (emailNorm && phoneNorm) {
            qb.where('LOWER(TRIM(r.customer_email)) = :email', { email: emailNorm }).orWhere(
              `${phoneExpr('r')} = :phone`,
              { phone: phoneNorm }
            );
          } else if (emailNorm) {
            qb.where('LOWER(TRIM(r.customer_email)) = :email', { email: emailNorm });
          } else {
            qb.where(`${phoneExpr('r')} = :phone`, { phone: phoneNorm! });
          }
        })
      )
      .andWhere('r.deleted_at IS NULL')
      .leftJoinAndSelect('r.customerLanguage', 'customerLanguage')
      .orderBy('r.created_at', 'DESC');

    const tQb = this.transferReservationRepository()
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere(
        new Brackets((qb) => {
          if (emailNorm && phoneNorm) {
            qb.where('LOWER(TRIM(t.passenger_email)) = :email', { email: emailNorm }).orWhere(
              `${transferPhoneExpr('t')} = :phone`,
              { phone: phoneNorm }
            );
          } else if (emailNorm) {
            qb.where('LOWER(TRIM(t.passenger_email)) = :email', { email: emailNorm });
          } else {
            qb.where(`${transferPhoneExpr('t')} = :phone`, { phone: phoneNorm! });
          }
        })
      )
      .leftJoinAndSelect('t.vehicle', 'vehicle')
      .orderBy('t.created_at', 'DESC');

    const [reservations, transferReservations] = await Promise.all([
      resQb.getMany(),
      tQb.getMany(),
    ]);

    return { reservations, transferReservations };
  }

  /**
   * Change Customer Password
   */
  static async changePassword(
    customerId: string,
    tenantId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const repo = this.customerRepository();
    
    const customer = await repo.findOne({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundError('Customer', customerId);
    }

    // Verify current password
    if (!customer.passwordHash) {
      throw new UnauthorizedError('Password not set for this account');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    customer.passwordHash = newPasswordHash;
    await repo.save(customer);
  }

  /**
   * Forgot Password - Generate reset token and send email
   */
  static async forgotPassword(
    tenantId: string,
    email?: string,
    idNumber?: string
  ): Promise<{ token: string; customer: Customer }> {
    const repo = this.customerRepository();

    // Build where clause (email OR idNumber)
    const whereClause: any = { tenantId };
    
    if (email) {
      whereClause.email = email;
    } else if (idNumber) {
      whereClause.idNumber = idNumber;
    } else {
      throw new ValidationError('Email or ID number is required');
    }

    // Find customer
    const customer = await repo.findOne({
      where: whereClause,
    });

    if (!customer) {
      // Don't reveal that customer doesn't exist (security best practice)
      throw new UnauthorizedError('If an account exists with this email/ID, a password reset link has been sent');
    }

    // Check if customer is active
    if (!customer.isActive) {
      throw new ForbiddenError('Account is inactive. Please contact support.');
    }

    // Check if customer has email (required for password reset)
    if (!customer.email) {
      throw new ValidationError('Email address is required for password reset. Please contact support.');
    }

    // Generate reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration (1 hour from now)
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    // Save token and expiration
    customer.passwordResetToken = resetToken;
    customer.passwordResetExpires = resetExpires;
    await repo.save(customer);

    return {
      token: resetToken,
      customer,
    };
  }

  /**
   * Reset Password - Reset password using token
   */
  static async resetPassword(
    tenantId: string,
    token: string,
    newPassword: string
  ): Promise<void> {
    const repo = this.customerRepository();

    // Find customer by token
    const customer = await repo.findOne({
      where: {
        tenantId,
        passwordResetToken: token,
      },
    });

    if (!customer) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    // Check if token is expired
    if (!customer.passwordResetExpires || customer.passwordResetExpires < new Date()) {
      // Clear expired token
      customer.passwordResetToken = undefined;
      customer.passwordResetExpires = undefined;
      await repo.save(customer);
      throw new UnauthorizedError('Reset token has expired. Please request a new one.');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    customer.passwordHash = newPasswordHash;
    customer.passwordResetToken = undefined;
    customer.passwordResetExpires = undefined;
    await repo.save(customer);
  }
}


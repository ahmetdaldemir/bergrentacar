import { Repository, LessThan, MoreThan } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Coupon, CouponStatus } from '../entities/coupon.entity';
import { CouponRedemption } from '../entities/coupon-redemption.entity';
import { WalletService } from './wallet.service';
import { WalletTransactionSource } from '../entities/wallet-transaction.entity';
import crypto from 'crypto';

export type CreateCouponInput = {
  tenantId: string;
  customerId?: string;
  value: number;
  currencyCode?: string;
  expiryDate?: Date;
  isSingleUse?: boolean;
  description?: string;
  createdByUserId?: string;
};

export type ValidateCouponInput = {
  tenantId: string;
  code: string;
  customerId?: string;
  reservationTotal?: number;
};

export type RedeemCouponInput = {
  tenantId: string;
  code: string;
  reservationId: string;
  reservationTotal: number;
  customerId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export class CouponService {
  private static couponRepo(): Repository<Coupon> {
    return AppDataSource.getRepository(Coupon);
  }

  private static redemptionRepo(): Repository<CouponRedemption> {
    return AppDataSource.getRepository(CouponRedemption);
  }

  /**
   * Generate unique coupon code
   */
  private static generateCode(): string {
    // Generate 8-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create coupon from customer's ParaPuan
   */
  static async createCouponFromPoints(
    input: CreateCouponInput
  ): Promise<Coupon> {
    return AppDataSource.transaction(async (manager) => {
      const couponRepo = manager.getRepository(Coupon);

      // If customer is specified, deduct points from wallet
      if (input.customerId) {
        const wallet = await WalletService.getWallet(
          input.tenantId,
          input.customerId
        );
        if (!wallet) {
          throw new Error('Customer wallet not found');
        }
        if (wallet.balance < input.value) {
          throw new Error('Insufficient ParaPuan balance');
        }

        // Debit points
        if (!input.createdByUserId) {
          throw new Error('createdByUserId is required when creating coupon from customer points');
        }

        await WalletService.debitPoints({
          tenantId: input.tenantId,
          customerId: input.customerId,
          amount: input.value,
          reason: `Coupon generation: ${input.description || 'N/A'}`,
          adminUserId: input.createdByUserId,
          description: `Points converted to coupon`,
        });
      }

      // Generate unique code
      let code = this.generateCode();
      let attempts = 0;
      while (await couponRepo.findOne({ where: { code } })) {
        code = this.generateCode();
        attempts++;
        if (attempts > 10) {
          throw new Error('Failed to generate unique coupon code');
        }
      }

      // Create coupon
      const coupon = couponRepo.create({
        tenantId: input.tenantId,
        code,
        value: input.value,
        currencyCode: input.currencyCode || 'TRY',
        pointsUsed: input.customerId ? input.value : 0,
        expiryDate: input.expiryDate,
        isSingleUse: input.isSingleUse ?? true,
        isUsed: false,
        status: CouponStatus.ACTIVE,
        customerId: input.customerId,
        createdByUserId: input.createdByUserId,
        description: input.description,
      });

      return couponRepo.save(coupon);
    });
  }

  /**
   * Validate coupon code
   */
  static async validateCoupon(input: ValidateCouponInput): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    error?: string;
  }> {
    const coupon = await this.couponRepo().findOne({
      where: { code: input.code, tenantId: input.tenantId },
      relations: ['customer'],
    });

    if (!coupon) {
      return { valid: false, error: 'Coupon code not found' };
    }

    // Check status
    if (coupon.status !== CouponStatus.ACTIVE) {
      return { valid: false, error: 'Coupon is not active' };
    }

    // Check expiry
    if (coupon.expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(coupon.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      if (today > expiry) {
        // Mark as expired
        coupon.status = CouponStatus.EXPIRED;
        await this.couponRepo().save(coupon);
        return { valid: false, error: 'Coupon has expired' };
      }
    }

    // Check if already used (single-use)
    if (coupon.isSingleUse && coupon.isUsed) {
      return { valid: false, error: 'Coupon has already been used' };
    }

    // Check customer binding
    if (coupon.customerId && input.customerId && coupon.customerId !== input.customerId) {
      return { valid: false, error: 'This coupon is not valid for your account' };
    }

    // Calculate discount amount (cannot exceed reservation total)
    let discountAmount = coupon.value;
    if (input.reservationTotal && discountAmount > input.reservationTotal) {
      discountAmount = input.reservationTotal;
    }

    return {
      valid: true,
      coupon,
      discountAmount,
    };
  }

  /**
   * Redeem coupon (mark as used and create redemption record)
   */
  static async redeemCoupon(input: RedeemCouponInput): Promise<{
    success: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    error?: string;
  }> {
    return AppDataSource.transaction(async (manager) => {
      const couponRepo = manager.getRepository(Coupon);
      const redemptionRepo = manager.getRepository(CouponRedemption);

      // Validate coupon
      const validation = await this.validateCoupon({
        tenantId: input.tenantId,
        code: input.code,
        customerId: input.customerId,
        reservationTotal: input.reservationTotal,
      });

      if (!validation.valid || !validation.coupon) {
        // Log failed redemption (only if coupon exists)
        if (validation.coupon) {
          await redemptionRepo.save(
            redemptionRepo.create({
              couponId: validation.coupon.id,
              tenantId: input.tenantId,
              reservationId: input.reservationId || null,
              discountAmount: 0,
              ipAddress: input.ipAddress,
              userAgent: input.userAgent,
              isSuccessful: false,
              failureReason: validation.error,
            })
          );
        }

        return {
          success: false,
          error: validation.error,
        };
      }

      const coupon = validation.coupon;

      // Calculate discount amount
      let discountAmount = coupon.value;
      if (discountAmount > input.reservationTotal) {
        discountAmount = input.reservationTotal;
      }

      // Mark coupon as used (only if single-use)
      if (coupon.isSingleUse) {
        coupon.isUsed = true;
        coupon.status = CouponStatus.USED;
        await couponRepo.save(coupon);
      }

      // Create redemption record
      const redemption = await redemptionRepo.save(
        redemptionRepo.create({
          couponId: coupon.id,
          tenantId: input.tenantId,
          reservationId: input.reservationId || null,
          discountAmount,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          isSuccessful: true,
        })
      );

      return {
        success: true,
        coupon,
        discountAmount,
      };
    });
  }

  /**
   * List coupons for tenant
   */
  static async listCoupons(
    tenantId: string,
    filters?: {
      status?: CouponStatus;
      customerId?: string;
      isUsed?: boolean;
    }
  ): Promise<Coupon[]> {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.isUsed !== undefined) {
      where.isUsed = filters.isUsed;
    }

    return this.couponRepo().find({
      where,
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get coupon by code
   */
  static async getCouponByCode(
    tenantId: string,
    code: string
  ): Promise<Coupon | null> {
    return this.couponRepo().findOne({
      where: { tenantId, code },
      relations: ['customer'],
    });
  }
}


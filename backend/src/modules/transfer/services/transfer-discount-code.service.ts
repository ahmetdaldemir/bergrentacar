import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import {
  TransferDiscountCode,
  DiscountType,
  DiscountCodeStatus,
} from '../entities/transfer-discount-code.entity';
import { TransferDiscountCodeUsage } from '../entities/transfer-discount-code-usage.entity';
import { logger } from '../../../utils/logger';

// ─── Input types ────────────────────────────────────────────────────────────

export interface CreateDiscountCodeInput {
  tenantId: string;
  createdByUserId?: string;
  /** Boş bırakılırsa otomatik oluşturulur */
  code?: string;
  discountType: DiscountType;
  discountValue: number;
  currencyCode?: string;
  /** PERCENTAGE için maksimum tutar limiti */
  maxDiscountAmount?: number | null;
  /** Minimum rezervasyon tutarı */
  minOrderAmount?: number | null;
  customerEmail?: string | null;
  customerName?: string | null;
  expiresAt?: string | Date | null;
  description?: string | null;
}

export interface ValidateDiscountCodeInput {
  tenantId: string;
  code: string;
  orderTotal?: number;
  customerEmail?: string;
}

export interface RedeemDiscountCodeInput {
  tenantId: string;
  code: string;
  orderTotal: number;
  customerEmail?: string;
  transferRequestId?: string;
  ipAddress?: string;
}

export interface ValidateResult {
  valid: boolean;
  discountCode?: TransferDiscountCode;
  discountAmount?: number;
  discountPercent?: number;
  error?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class TransferDiscountCodeService {
  private static codeRepo(): Repository<TransferDiscountCode> {
    return AppDataSource.getRepository(TransferDiscountCode);
  }

  private static usageRepo(): Repository<TransferDiscountCodeUsage> {
    return AppDataSource.getRepository(TransferDiscountCodeUsage);
  }

  // ── Code generation ──────────────────────────────────────────────────────

  private static generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private static async uniqueCode(tenantId: string, customCode?: string): Promise<string> {
    if (customCode) {
      const exists = await this.codeRepo().findOne({ where: { tenantId, code: customCode.toUpperCase() } });
      if (exists) throw new Error(`Code "${customCode}" already exists for this tenant`);
      return customCode.toUpperCase();
    }

    let code = this.generateCode();
    let attempts = 0;
    while (await this.codeRepo().findOne({ where: { code } })) {
      code = this.generateCode();
      if (++attempts > 15) throw new Error('Failed to generate unique discount code');
    }
    return code;
  }

  // ── Discount calculation ─────────────────────────────────────────────────

  static calculateDiscount(
    dc: TransferDiscountCode,
    orderTotal: number
  ): { discountAmount: number; discountPercent?: number } {
    if (dc.discountType === DiscountType.PERCENTAGE) {
      const pct = Math.min(Number(dc.discountValue), 100);
      let amount = (orderTotal * pct) / 100;
      if (dc.maxDiscountAmount) amount = Math.min(amount, Number(dc.maxDiscountAmount));
      amount = Math.min(amount, orderTotal);
      return { discountAmount: parseFloat(amount.toFixed(2)), discountPercent: pct };
    }
    // FIXED
    const amount = Math.min(Number(dc.discountValue), orderTotal);
    return { discountAmount: parseFloat(amount.toFixed(2)) };
  }

  // ── Public: e-posta adresine tanımlı kodlar (tenant sitesinden çağrılır) ───

  static async listByCustomerEmail(
    tenantId: string,
    customerEmail: string
  ): Promise<TransferDiscountCode[]> {
    const email = (customerEmail || '').trim().toLowerCase();
    if (!email) return [];
    return this.codeRepo().find({
      where: { tenantId, customerEmail: email },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Admin CRUD ───────────────────────────────────────────────────────────

  static async list(
    tenantId: string,
    filters?: { status?: DiscountCodeStatus; customerEmail?: string }
  ): Promise<TransferDiscountCode[]> {
    const where: Record<string, any> = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.customerEmail) where.customerEmail = filters.customerEmail;

    return this.codeRepo().find({ where, order: { createdAt: 'DESC' } });
  }

  static async getById(id: string, tenantId: string): Promise<TransferDiscountCode | null> {
    return this.codeRepo().findOne({ where: { id, tenantId } });
  }

  static async getByCode(code: string, tenantId: string): Promise<TransferDiscountCode | null> {
    return this.codeRepo().findOne({ where: { code: code.toUpperCase(), tenantId } });
  }

  static async create(input: CreateDiscountCodeInput): Promise<TransferDiscountCode> {
    if (input.discountType === DiscountType.PERCENTAGE) {
      if (input.discountValue <= 0 || input.discountValue > 100) {
        throw new Error('Percentage discount must be between 1 and 100');
      }
    } else {
      if (input.discountValue <= 0) {
        throw new Error('Fixed discount value must be greater than 0');
      }
    }

    const code = await this.uniqueCode(input.tenantId, input.code);

    const entity = this.codeRepo().create({
      tenantId: input.tenantId,
      createdByUserId: input.createdByUserId,
      code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      currencyCode: input.currencyCode ?? 'EUR',
      maxDiscountAmount: input.maxDiscountAmount ?? null,
      minOrderAmount: input.minOrderAmount ?? null,
      customerEmail: input.customerEmail ? input.customerEmail.toLowerCase() : null,
      customerName: input.customerName ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt as string) : null,
      description: input.description ?? null,
      status: DiscountCodeStatus.ACTIVE,
      isUsed: false,
    });

    return this.codeRepo().save(entity);
  }

  static async cancel(id: string, tenantId: string): Promise<TransferDiscountCode> {
    const dc = await this.codeRepo().findOne({ where: { id, tenantId } });
    if (!dc) throw new Error('Discount code not found');
    if (dc.status === DiscountCodeStatus.USED) throw new Error('Cannot cancel a used code');

    dc.status = DiscountCodeStatus.CANCELLED;
    return this.codeRepo().save(dc);
  }

  static async delete(id: string, tenantId: string): Promise<void> {
    const dc = await this.codeRepo().findOne({ where: { id, tenantId } });
    if (!dc) throw new Error('Discount code not found');
    if (dc.status === DiscountCodeStatus.USED) throw new Error('Cannot delete a used code');

    await this.usageRepo().delete({ discountCodeId: id });
    await this.codeRepo().remove(dc);
  }

  /** Kullanım geçmişi */
  static async listUsages(discountCodeId: string, tenantId: string): Promise<TransferDiscountCodeUsage[]> {
    return this.usageRepo().find({
      where: { discountCodeId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Public / Frontend ────────────────────────────────────────────────────

  /**
   * Anlık kod doğrulama — kullanım yapmaz, bilgi döndürür.
   */
  static async validate(input: ValidateDiscountCodeInput): Promise<ValidateResult> {
    const dc = await this.codeRepo().findOne({
      where: { code: input.code.toUpperCase(), tenantId: input.tenantId },
    });

    if (!dc) return { valid: false, error: 'Geçersiz indirim kodu' };

    // Durum kontrolü
    if (dc.status !== DiscountCodeStatus.ACTIVE) {
      const msgs: Record<DiscountCodeStatus, string> = {
        [DiscountCodeStatus.ACTIVE]: '',
        [DiscountCodeStatus.USED]: 'Bu indirim kodu daha önce kullanılmış',
        [DiscountCodeStatus.EXPIRED]: 'Bu indirim kodunun süresi dolmuş',
        [DiscountCodeStatus.CANCELLED]: 'Bu indirim kodu iptal edilmiş',
      };
      return { valid: false, error: msgs[dc.status] };
    }

    // Kullanılmış mı?
    if (dc.isUsed) return { valid: false, error: 'Bu indirim kodu daha önce kullanılmış' };

    // Son kullanım tarihi
    if (dc.expiresAt && new Date() > new Date(dc.expiresAt)) {
      dc.status = DiscountCodeStatus.EXPIRED;
      await this.codeRepo().save(dc);
      return { valid: false, error: 'Bu indirim kodunun süresi dolmuş' };
    }

    // Müşteri kısıtlaması
    if (dc.customerEmail && input.customerEmail) {
      if (dc.customerEmail.toLowerCase() !== input.customerEmail.toLowerCase()) {
        return { valid: false, error: 'Bu indirim kodu hesabınıza tanımlı değil' };
      }
    }

    // Minimum tutar kontrolü
    if (dc.minOrderAmount && input.orderTotal !== undefined) {
      if (input.orderTotal < Number(dc.minOrderAmount)) {
        return {
          valid: false,
          error: `Bu kod en az ${dc.minOrderAmount} ${dc.currencyCode} tutarındaki rezervasyonlarda geçerlidir`,
        };
      }
    }

    const orderTotal = input.orderTotal ?? 0;
    const { discountAmount, discountPercent } = this.calculateDiscount(dc, orderTotal);

    return {
      valid: true,
      discountCode: dc,
      discountAmount: orderTotal > 0 ? discountAmount : undefined,
      discountPercent,
    };
  }

  /**
   * Kodu kullan — rezervasyon tamamlandığında çağrılır.
   * Kodu USED olarak işaretler ve kullanım kaydı oluşturur.
   */
  static async redeem(input: RedeemDiscountCodeInput): Promise<{
    success: boolean;
    discountAmount?: number;
    error?: string;
  }> {
    return AppDataSource.transaction(async (manager) => {
      const codeRepo = manager.getRepository(TransferDiscountCode);
      const usageRepo = manager.getRepository(TransferDiscountCodeUsage);

      const dc = await codeRepo.findOne({
        where: { code: input.code.toUpperCase(), tenantId: input.tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      const logFailure = async (reason: string) => {
        if (dc) {
          await usageRepo.save(
            usageRepo.create({
              discountCodeId: dc.id,
              tenantId: input.tenantId,
              transferRequestId: input.transferRequestId ?? null,
              discountAmount: 0,
              orderTotal: input.orderTotal,
              customerEmail: input.customerEmail ?? null,
              ipAddress: input.ipAddress ?? null,
              isSuccessful: false,
              failureReason: reason,
            })
          );
        }
      };

      if (!dc) { await logFailure('Code not found'); return { success: false, error: 'Geçersiz indirim kodu' }; }
      if (dc.status !== DiscountCodeStatus.ACTIVE || dc.isUsed) {
        await logFailure('Already used or inactive');
        return { success: false, error: 'Bu indirim kodu kullanılamaz' };
      }
      if (dc.expiresAt && new Date() > new Date(dc.expiresAt)) {
        dc.status = DiscountCodeStatus.EXPIRED;
        await codeRepo.save(dc);
        await logFailure('Expired');
        return { success: false, error: 'Bu indirim kodunun süresi dolmuş' };
      }
      if (dc.customerEmail && input.customerEmail) {
        if (dc.customerEmail.toLowerCase() !== input.customerEmail.toLowerCase()) {
          await logFailure('Customer mismatch');
          return { success: false, error: 'Bu indirim kodu hesabınıza tanımlı değil' };
        }
      }
      if (dc.minOrderAmount && input.orderTotal < Number(dc.minOrderAmount)) {
        await logFailure('Order total below minimum');
        return { success: false, error: `Minimum rezervasyon tutarı: ${dc.minOrderAmount} ${dc.currencyCode}` };
      }

      const { discountAmount } = this.calculateDiscount(dc, input.orderTotal);

      // Tek kullanım — kodu kullanıldı olarak işaretle
      dc.isUsed = true;
      dc.status = DiscountCodeStatus.USED;
      dc.usedAt = new Date();
      await codeRepo.save(dc);

      await usageRepo.save(
        usageRepo.create({
          discountCodeId: dc.id,
          tenantId: input.tenantId,
          transferRequestId: input.transferRequestId ?? null,
          discountAmount,
          orderTotal: input.orderTotal,
          customerEmail: input.customerEmail ?? null,
          ipAddress: input.ipAddress ?? null,
          isSuccessful: true,
        })
      );

      logger.info(`Discount code redeemed: ${dc.code} | tenant: ${input.tenantId} | discount: ${discountAmount}`);

      return { success: true, discountAmount };
    });
  }
}

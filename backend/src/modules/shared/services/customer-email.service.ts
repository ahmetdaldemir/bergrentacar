import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { CustomerEmail } from '../entities/customer-email.entity';
import { randomUUID } from 'crypto';

export type CreateCustomerEmailInput = {
  tenantId: string;
  customerId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  isSubscribed?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateCustomerEmailInput = Partial<Omit<CreateCustomerEmailInput, 'tenantId' | 'email'>>;

export class CustomerEmailService {
  private static repository(): Repository<CustomerEmail> {
    return AppDataSource.getRepository(CustomerEmail);
  }

  /**
   * Email listesini getir (email marketing için)
   */
  static async list(tenantId: string, options?: { 
    isSubscribed?: boolean;
    isActive?: boolean;
  }): Promise<CustomerEmail[]> {
    const where: any = { tenantId };
    if (options?.isSubscribed !== undefined) {
      where.isSubscribed = options.isSubscribed;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.repository().find({
      where,
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Email ID'ye göre getir
   */
  static async getById(id: string, tenantId: string): Promise<CustomerEmail | null> {
    return this.repository().findOne({
      where: { id, tenantId },
      relations: ['customer'],
    });
  }

  /**
   * Email adresine göre getir
   */
  static async getByEmail(email: string, tenantId: string): Promise<CustomerEmail | null> {
    return this.repository().findOne({
      where: { email: email.toLowerCase(), tenantId },
      relations: ['customer'],
    });
  }

  /**
   * Müşteri email kaydı oluştur veya güncelle
   */
  static async createOrUpdate(input: CreateCustomerEmailInput): Promise<CustomerEmail> {
    const repo = this.repository();
    const normalizedEmail = input.email.toLowerCase();

    // Mevcut email kaydını kontrol et
    let customerEmail = await repo.findOne({
      where: { email: normalizedEmail, tenantId: input.tenantId },
    });

    if (customerEmail) {
      // Güncelle
      customerEmail.customerId = input.customerId || customerEmail.customerId;
      customerEmail.firstName = input.firstName || customerEmail.firstName;
      customerEmail.lastName = input.lastName || customerEmail.lastName;
      customerEmail.fullName = input.fullName || customerEmail.fullName;
      customerEmail.isSubscribed = input.isSubscribed !== undefined ? input.isSubscribed : customerEmail.isSubscribed;
      if (input.isSubscribed && !customerEmail.isSubscribed) {
        customerEmail.subscriptionDate = new Date();
        customerEmail.unsubscriptionDate = undefined;
        customerEmail.unsubscriptionReason = undefined;
      }
      if (input.metadata) {
        customerEmail.metadata = { ...customerEmail.metadata, ...input.metadata };
      }
      customerEmail.isActive = true;
    } else {
      // Yeni kayıt oluştur
      customerEmail = repo.create({
        tenantId: input.tenantId,
        customerId: input.customerId,
        email: normalizedEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        fullName: input.fullName,
        isSubscribed: input.isSubscribed !== undefined ? input.isSubscribed : true,
        subscriptionDate: new Date(),
        emailVerified: false,
        isActive: true,
        metadata: input.metadata,
      });
    }

    return repo.save(customerEmail);
  }

  /**
   * Email aboneliğini iptal et
   */
  static async unsubscribe(email: string, tenantId: string, reason?: string): Promise<void> {
    const repo = this.repository();
    const customerEmail = await repo.findOne({
      where: { email: email.toLowerCase(), tenantId },
    });

    if (customerEmail) {
      customerEmail.isSubscribed = false;
      customerEmail.unsubscriptionDate = new Date();
      customerEmail.unsubscriptionReason = reason;
      await repo.save(customerEmail);
    }
  }

  /**
   * Email aboneliğini yeniden aktif et
   */
  static async resubscribe(email: string, tenantId: string): Promise<void> {
    const repo = this.repository();
    const customerEmail = await repo.findOne({
      where: { email: email.toLowerCase(), tenantId },
    });

    if (customerEmail) {
      customerEmail.isSubscribed = true;
      customerEmail.subscriptionDate = new Date();
      customerEmail.unsubscriptionDate = undefined;
      customerEmail.unsubscriptionReason = undefined;
      await repo.save(customerEmail);
    }
  }

  /**
   * Email doğrulama token'ı oluştur
   */
  static async generateVerificationToken(email: string, tenantId: string): Promise<string> {
    const repo = this.repository();
    const customerEmail = await repo.findOne({
      where: { email: email.toLowerCase(), tenantId },
    });

    if (!customerEmail) {
      throw new Error('Customer email not found');
    }

    const token = randomUUID();
    customerEmail.verificationToken = token;
    await repo.save(customerEmail);

    return token;
  }

  /**
   * Email'i doğrula
   */
  static async verifyEmail(token: string, tenantId: string): Promise<boolean> {
    const repo = this.repository();
    const customerEmail = await repo.findOne({
      where: { verificationToken: token, tenantId },
    });

    if (!customerEmail) {
      return false;
    }

    customerEmail.emailVerified = true;
    customerEmail.verificationDate = new Date();
    customerEmail.verificationToken = undefined;
    await repo.save(customerEmail);

    return true;
  }

  /**
   * Email kaydını sil (soft delete)
   */
  static async remove(id: string, tenantId: string): Promise<void> {
    const repo = this.repository();
    const customerEmail = await repo.findOne({ where: { id, tenantId } });

    if (!customerEmail) {
      throw new Error('Customer email not found');
    }

    customerEmail.isActive = false;
    await repo.save(customerEmail);
  }

  /**
   * Bounce sayısını artır
   */
  static async incrementBounce(email: string, tenantId: string): Promise<void> {
    const repo = this.repository();
    const customerEmail = await repo.findOne({
      where: { email: email.toLowerCase(), tenantId },
    });

    if (customerEmail) {
      customerEmail.bounceCount = (customerEmail.bounceCount || 0) + 1;
      customerEmail.lastBounceDate = new Date();
      // Eğer bounce sayısı çok fazlaysa, aboneliği iptal et
      if (customerEmail.bounceCount >= 5) {
        customerEmail.isSubscribed = false;
        customerEmail.unsubscriptionDate = new Date();
        customerEmail.unsubscriptionReason = 'Too many bounces';
      }
      await repo.save(customerEmail);
    }
  }
}


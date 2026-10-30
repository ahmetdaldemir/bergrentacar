import { Repository } from 'typeorm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../../config/data-source';
import { normalizePhoneLastDigits } from '../../../utils/phone-match';
import { Customer, CustomerGender, CustomerIdType } from '../entities/customer.entity';
import { sendCustomerWelcomeEmail } from '../../../services/customer-email.service';
import { CustomerEmailService } from './customer-email.service';

export type CreateCustomerInput = {
  tenantId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthPlace?: string;
  birthDate?: string | Date;
  gender?: CustomerGender;
  languageId?: string;
  country?: string;
  mobilePhone?: string;
  homePhone?: string;
  email?: string;
  password?: string;
  taxOffice?: string;
  taxNumber?: string;
  homeAddress?: string;
  workAddress?: string;
  idType?: CustomerIdType;
  idNumber?: string;
  idIssuePlace?: string;
  idIssueDate?: string | Date;
  licenseNumber?: string;
  licenseClass?: string;
  licenseIssuePlace?: string;
  licenseIssueDate?: string | Date;
  isActive?: boolean;
  isBlacklisted?: boolean;
};

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'tenantId'>>;

export class CustomerService {
  private static repository(): Repository<Customer> {
    return AppDataSource.getRepository(Customer);
  }

  static async list(tenantId: string): Promise<Customer[]> {
    return this.repository().find({
      where: { tenantId },
      relations: ['language'],
      order: { fullName: 'ASC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<Customer | null> {
    const repo = this.repository();
    const customer = await repo.findOne({ where: { id, tenantId } });
    if (!customer) return null;
    try {
      const withLanguage = await repo.findOne({
        where: { id, tenantId },
        relations: ['language'],
      });
      return withLanguage ?? customer;
    } catch {
      return customer;
    }
  }

  static async create(input: CreateCustomerInput): Promise<Customer> {
    const repo = this.repository();
    
    // Parse dates
    const birthDate = input.birthDate ? new Date(input.birthDate) : undefined;
    const idIssueDate = input.idIssueDate ? new Date(input.idIssueDate) : undefined;
    const licenseIssueDate = input.licenseIssueDate ? new Date(input.licenseIssueDate) : undefined;

    // Otomatik şifre oluştur: id_number kullan, eğer yoksa boş bırak
    // Panelden yeni müşteri oluştururken şifre girilmemeli, otomatik oluşturulmalı
    let plainPassword: string | undefined;
    let passwordHash: string | undefined;

    if (input.password) {
      // Eğer şifre manuel olarak girilmişse (eski sistem uyumluluğu için)
      plainPassword = input.password;
      passwordHash = await bcrypt.hash(input.password, 10);
    } else if (input.idNumber) {
      // Yeni müşteri için otomatik şifre: id_number
      plainPassword = input.idNumber;
      passwordHash = await bcrypt.hash(input.idNumber, 10);
    }

    const customer = repo.create({
      tenantId: input.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: input.fullName,
      birthPlace: input.birthPlace,
      birthDate,
      gender: input.gender,
      languageId: input.languageId,
      country: input.country,
      mobilePhone: input.mobilePhone,
      homePhone: input.homePhone,
      email: input.email,
      passwordHash,
      taxOffice: input.taxOffice,
      taxNumber: input.taxNumber,
      homeAddress: input.homeAddress,
      workAddress: input.workAddress,
      idType: input.idType,
      idNumber: input.idNumber,
      idIssuePlace: input.idIssuePlace,
      idIssueDate,
      licenseNumber: input.licenseNumber,
      licenseClass: input.licenseClass,
      licenseIssuePlace: input.licenseIssuePlace,
      licenseIssueDate,
      isActive: input.isActive !== undefined ? input.isActive : true,
      isBlacklisted: input.isBlacklisted || false,
    });

    const savedCustomer = await repo.save(customer);

    // Email marketing için customer_emails tablosuna kayıt ekle
    if (savedCustomer.email) {
      try {
        await CustomerEmailService.createOrUpdate({
          tenantId: savedCustomer.tenantId,
          customerId: savedCustomer.id,
          email: savedCustomer.email,
          firstName: savedCustomer.firstName,
          lastName: savedCustomer.lastName,
          fullName: savedCustomer.fullName,
          isSubscribed: true, // Yeni müşteri varsayılan olarak abone
        });
      } catch (error) {
        // Email kaydı hatası müşteri oluşturmayı engellemez
        console.error('Failed to create customer email record:', error);
      }
    }

    // Yeni müşteri kaydı yapılıyorsa ve email varsa, hoş geldin email'i gönder
    // Email'de şifre açık olarak gönderilir
    if (savedCustomer.email && plainPassword) {
      try {
        await sendCustomerWelcomeEmail(savedCustomer, plainPassword);
      } catch (error) {
        // Email gönderme hatası müşteri oluşturmayı engellemez
        console.error('Failed to send customer welcome email:', error);
      }
    }

    return savedCustomer;
  }

  static async update(id: string, tenantId: string, input: UpdateCustomerInput): Promise<Customer> {
    const repo = this.repository();
    const customer = await repo.findOne({ where: { id, tenantId } });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Parse dates if provided
    if (input.birthDate) {
      input.birthDate = new Date(input.birthDate);
    }
    if (input.idIssueDate) {
      input.idIssueDate = new Date(input.idIssueDate);
    }
    if (input.licenseIssueDate) {
      input.licenseIssueDate = new Date(input.licenseIssueDate);
    }

    // Hash password if provided
    if (input.password) {
      (input as any).passwordHash = await bcrypt.hash(input.password, 10);
      delete (input as any).password;
    }

    // Remove tenantId from input to prevent overwriting
    const { tenantId: _, ...updateData } = input as any;

    // Boş string UUID alanları null yap (PostgreSQL UUID kolonu '' kabul etmez)
    if (updateData.languageId === '') {
      updateData.languageId = null;
    }

    Object.assign(customer, updateData);
    return repo.save(customer);
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const repo = this.repository();
    const customer = await repo.findOne({ where: { id, tenantId } });

    if (!customer) {
      throw new Error('Customer not found');
    }

    await repo.remove(customer);
  }

  /**
   * Müşteri şifresini değiştir
   */
  static async changePassword(id: string, tenantId: string, newPassword: string): Promise<Customer> {
    const repo = this.repository();
    const customer = await repo.findOne({ where: { id, tenantId } });

    if (!customer) {
      throw new Error('Customer not found');
    }

    if (!newPassword || newPassword.trim().length === 0) {
      throw new Error('New password is required');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    customer.passwordHash = await bcrypt.hash(newPassword, 10);
    return repo.save(customer);
  }

  /**
   * Transfer (ve benzeri) rezervasyon: e-posta tenant’ta kayıtlı değilse müşteri oluşturur.
   * Yeni kayıtta rastgele şifre atanır ve hoş geldin maili (giriş bilgileri) gönderilir.
   */
  static async ensureCustomerFromTransferBooking(params: {
    tenantId: string;
    email: string;
    passengerName: string;
    passengerPhone?: string;
  }): Promise<{ customer: Customer | null; created: boolean }> {
    const emailNorm = params.email?.trim().toLowerCase();
    if (!emailNorm || !params.tenantId) {
      return { customer: null, created: false };
    }

    const repo = this.repository();
    const existing = await repo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId: params.tenantId })
      .andWhere('LOWER(TRIM(c.email)) = :email', { email: emailNorm })
      .getOne();

    if (existing) {
      return { customer: existing, created: false };
    }

    const phoneNorm = normalizePhoneLastDigits(params.passengerPhone);
    if (phoneNorm) {
      const byPhone = await repo
        .createQueryBuilder('c')
        .where('c.tenant_id = :tenantId', { tenantId: params.tenantId })
        .andWhere(
          `(RIGHT(REGEXP_REPLACE(COALESCE(c.mobile_phone, ''), '[^0-9]', '', 'g'), 10) = :p OR ` +
            `RIGHT(REGEXP_REPLACE(COALESCE(c.home_phone, ''), '[^0-9]', '', 'g'), 10) = :p)`,
          { p: phoneNorm }
        )
        .getOne();
      if (byPhone) {
        return { customer: byPhone, created: false };
      }
    }

    const name = (params.passengerName || '').trim() || 'Müşteri';
    const parts = name.split(/\s+/).filter(Boolean);
    const firstName = (parts[0] || 'Müşteri').slice(0, 100);
    const lastName = (
      parts.length > 1 ? parts.slice(1).join(' ') : firstName
    ).slice(0, 100);
    const fullName = name.slice(0, 200) || `${firstName} ${lastName}`;

    const plainPassword = crypto.randomBytes(12).toString('hex');

    try {
      const customer = await this.create({
        tenantId: params.tenantId,
        firstName,
        lastName,
        fullName,
        email: emailNorm,
        mobilePhone: params.passengerPhone?.trim()?.slice(0, 50) || undefined,
        password: plainPassword,
        isActive: true,
        isBlacklisted: false,
      });
      return { customer, created: true };
    } catch (error) {
      const again = await repo
        .createQueryBuilder('c')
        .where('c.tenant_id = :tenantId', { tenantId: params.tenantId })
        .andWhere('LOWER(TRIM(c.email)) = :email', { email: emailNorm })
        .getOne();
      if (again) {
        return { customer: again, created: false };
      }
      if (phoneNorm) {
        const byPhone = await repo
          .createQueryBuilder('c')
          .where('c.tenant_id = :tenantId', { tenantId: params.tenantId })
          .andWhere(
            `(RIGHT(REGEXP_REPLACE(COALESCE(c.mobile_phone, ''), '[^0-9]', '', 'g'), 10) = :p OR ` +
              `RIGHT(REGEXP_REPLACE(COALESCE(c.home_phone, ''), '[^0-9]', '', 'g'), 10) = :p)`,
            { p: phoneNorm }
          )
          .getOne();
        if (byPhone) {
          return { customer: byPhone, created: false };
        }
      }
      console.error('ensureCustomerFromTransferBooking failed:', error);
      return { customer: null, created: false };
    }
  }
}


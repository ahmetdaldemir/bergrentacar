import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { CommissionTransaction, TransactionType, TransactionStatus } from '../entities/commission-transaction.entity';
import { TenantServiceAgreement } from '../entities/tenant-service-agreement.entity';
import { Reservation } from '../../shared/entities/reservation.entity';

export interface CalculateCommissionInput {
  agreementId: string;
  transactionAmount: number;
  currencyCode?: string;
  reservationId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CommissionCalculationResult {
  commissionAmount: number;
  commissionType: string;
  commissionRate?: number;
  commissionFixed?: number;
  calculationDetails: string;
}

export class CommissionService {
  private static transactionRepo(): Repository<CommissionTransaction> {
    return AppDataSource.getRepository(CommissionTransaction);
  }

  private static agreementRepo(): Repository<TenantServiceAgreement> {
    return AppDataSource.getRepository(TenantServiceAgreement);
  }

  private static reservationRepo(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  /**
   * Calculate commission based on agreement
   */
  static calculateCommission(
    agreement: TenantServiceAgreement,
    transactionAmount: number
  ): CommissionCalculationResult {
    let commissionAmount = 0;
    let calculationDetails = '';

    if (agreement.commissionType === 'percentage') {
      const rate = agreement.commissionRate || 0;
      commissionAmount = (transactionAmount * rate) / 100;
      calculationDetails = `${rate}% of ${transactionAmount} = ${commissionAmount}`;

      // Apply min/max limits
      if (agreement.minCommission && commissionAmount < agreement.minCommission) {
        commissionAmount = agreement.minCommission;
        calculationDetails += ` (adjusted to minimum: ${agreement.minCommission})`;
      }
      if (agreement.maxCommission && commissionAmount > agreement.maxCommission) {
        commissionAmount = agreement.maxCommission;
        calculationDetails += ` (adjusted to maximum: ${agreement.maxCommission})`;
      }
    } else if (agreement.commissionType === 'fixed') {
      commissionAmount = agreement.commissionFixed || 0;
      calculationDetails = `Fixed commission: ${commissionAmount}`;
    } else if (agreement.commissionType === 'hybrid') {
      // Percentage + fixed
      const rate = agreement.commissionRate || 0;
      const fixed = agreement.commissionFixed || 0;
      const percentageAmount = (transactionAmount * rate) / 100;
      commissionAmount = percentageAmount + fixed;
      calculationDetails = `${rate}% of ${transactionAmount} (${percentageAmount}) + fixed ${fixed} = ${commissionAmount}`;

      // Apply min/max limits
      if (agreement.minCommission && commissionAmount < agreement.minCommission) {
        commissionAmount = agreement.minCommission;
        calculationDetails += ` (adjusted to minimum: ${agreement.minCommission})`;
      }
      if (agreement.maxCommission && commissionAmount > agreement.maxCommission) {
        commissionAmount = agreement.maxCommission;
        calculationDetails += ` (adjusted to maximum: ${agreement.maxCommission})`;
      }
    }

    return {
      commissionAmount: Math.round(commissionAmount * 100) / 100, // Round to 2 decimals
      commissionType: agreement.commissionType,
      commissionRate: agreement.commissionRate ?? undefined,
      commissionFixed: agreement.commissionFixed ?? undefined,
      calculationDetails,
    };
  }

  /**
   * Create commission transaction
   */
  static async createTransaction(input: CalculateCommissionInput): Promise<CommissionTransaction> {
    // Get agreement
    const agreement = await this.agreementRepo().findOne({
      where: { id: input.agreementId },
      relations: ['providerTenant', 'consumerTenant'],
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.status !== 'active') {
      throw new Error('Agreement is not active');
    }

    // Calculate commission
    const calculation = this.calculateCommission(agreement, input.transactionAmount);

    // Create transaction
    const transaction = this.transactionRepo().create({
      providerTenantId: agreement.providerTenantId,
      consumerTenantId: agreement.consumerTenantId,
      agreementId: agreement.id,
      reservationId: input.reservationId,
      type: TransactionType.COMMISSION_EARNED, // Provider earns
      status: TransactionStatus.PENDING,
      transactionAmount: input.transactionAmount,
      commissionAmount: calculation.commissionAmount,
      currencyCode: input.currencyCode || 'TRY',
      commissionType: calculation.commissionType,
      commissionRate: calculation.commissionRate,
      commissionFixed: calculation.commissionFixed,
      transactionDate: new Date(),
      description: input.description || calculation.calculationDetails,
      metadata: {
        ...input.metadata,
        calculationDetails: calculation.calculationDetails,
      },
    });

    const savedTransaction = await this.transactionRepo().save(transaction);

    // Update agreement statistics
    agreement.totalTransactions += 1;
    agreement.totalCommissionEarned += calculation.commissionAmount;
    await this.agreementRepo().save(agreement);

    // Process transaction (mark as processed)
    savedTransaction.status = TransactionStatus.PROCESSED;
    savedTransaction.processedAt = new Date();
    await this.transactionRepo().save(savedTransaction);

    return savedTransaction;
  }

  /**
   * Process commission for a reservation
   */
  static async processReservationCommission(reservationId: string): Promise<CommissionTransaction | null> {
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Check if reservation has marketplace service
    const metadata = reservation.metadata as any;
    if (!metadata?.marketplaceAgreementId) {
      return null; // Not a marketplace reservation
    }

    // Get agreement
    const agreement = await this.agreementRepo().findOne({
      where: { id: metadata.marketplaceAgreementId },
    });

    if (!agreement || agreement.status !== 'active') {
      return null;
    }

    // Get transaction amount from reservation
    const transactionAmount = Number(metadata.totalPrice || metadata.price || 0);
    if (transactionAmount <= 0) {
      return null;
    }

    // Create commission transaction
    return this.createTransaction({
      agreementId: agreement.id,
      transactionAmount,
      currencyCode: metadata.currencyCode || 'TRY',
      reservationId,
      description: `Commission for reservation ${reservation.reference}`,
      metadata: {
        reservationReference: reservation.reference,
        reservationType: reservation.type,
      },
    });
  }

  /**
   * List transactions
   */
  static async listTransactions(filters?: {
    providerTenantId?: string;
    consumerTenantId?: string;
    agreementId?: string;
    status?: TransactionStatus;
    type?: TransactionType;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<CommissionTransaction[]> {
    const where: any = {};
    if (filters?.providerTenantId) where.providerTenantId = filters.providerTenantId;
    if (filters?.consumerTenantId) where.consumerTenantId = filters.consumerTenantId;
    if (filters?.agreementId) where.agreementId = filters.agreementId;
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    // Handle date range
    let dateFilter: any = undefined;
    if (filters?.fromDate && filters?.toDate) {
      dateFilter = Between(filters.fromDate, filters.toDate);
    } else if (filters?.fromDate) {
      dateFilter = MoreThanOrEqual(filters.fromDate);
    } else if (filters?.toDate) {
      dateFilter = LessThanOrEqual(filters.toDate);
    }
    if (dateFilter) {
      where.transactionDate = dateFilter;
    }

    return this.transactionRepo().find({
      where,
      relations: ['providerTenant', 'consumerTenant', 'agreement', 'reservation'],
      order: { transactionDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get transaction by ID
   */
  static async getTransaction(id: string): Promise<CommissionTransaction | null> {
    return this.transactionRepo().findOne({
      where: { id },
      relations: ['providerTenant', 'consumerTenant', 'agreement', 'reservation'],
    });
  }

  /**
   * Get commission summary for tenant
   */
  static async getCommissionSummary(tenantId: string, asProvider: boolean): Promise<{
    totalEarned: number;
    totalPaid: number;
    totalTransactions: number;
    pendingAmount: number;
    processedAmount: number;
  }> {
    const transactions = await this.listTransactions({
      [asProvider ? 'providerTenantId' : 'consumerTenantId']: tenantId,
    });

    const summary = {
      totalEarned: 0,
      totalPaid: 0,
      totalTransactions: transactions.length,
      pendingAmount: 0,
      processedAmount: 0,
    };

    transactions.forEach(t => {
      if (t.type === TransactionType.COMMISSION_EARNED) {
        summary.totalEarned += Number(t.commissionAmount);
      } else {
        summary.totalPaid += Number(t.commissionAmount);
      }

      if (t.status === TransactionStatus.PROCESSED) {
        summary.processedAmount += Number(t.commissionAmount);
      } else if (t.status === TransactionStatus.PENDING) {
        summary.pendingAmount += Number(t.commissionAmount);
      }
    });

    return summary;
  }
}


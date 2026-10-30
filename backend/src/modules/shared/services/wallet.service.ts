import { Repository, DataSource } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { CustomerWallet } from '../entities/customer-wallet.entity';
import {
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionSource,
} from '../entities/wallet-transaction.entity';
import { Reservation } from '../entities/reservation.entity';

export type CreditPointsInput = {
  tenantId: string;
  customerId: string;
  amount: number;
  source: WalletTransactionSource;
  description?: string;
  reservationId?: string;
  transactionId?: string; // For idempotency
  adminUserId?: string;
};

export type DebitPointsInput = {
  tenantId: string;
  customerId: string;
  amount: number;
  reason: string;
  adminUserId: string;
  description?: string;
};

export class WalletService {
  private static walletRepo(): Repository<CustomerWallet> {
    return AppDataSource.getRepository(CustomerWallet);
  }

  private static transactionRepo(): Repository<WalletTransaction> {
    return AppDataSource.getRepository(WalletTransaction);
  }

  /**
   * Get or create wallet for customer
   */
  static async getOrCreateWallet(
    tenantId: string,
    customerId: string
  ): Promise<CustomerWallet> {
    let wallet = await this.walletRepo().findOne({
      where: { tenantId, customerId },
      relations: ['customer', 'tenant'],
    });

    if (!wallet) {
      wallet = this.walletRepo().create({
        tenantId,
        customerId,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
      });
      wallet = await this.walletRepo().save(wallet);
    }

    return wallet;
  }

  /**
   * Get wallet by ID
   */
  static async getWallet(
    tenantId: string,
    customerId: string
  ): Promise<CustomerWallet | null> {
    return this.walletRepo().findOne({
      where: { tenantId, customerId },
      relations: ['customer', 'tenant', 'transactions'],
    });
  }

  /**
   * Credit points to customer wallet (idempotent)
   */
  static async creditPoints(input: CreditPointsInput): Promise<WalletTransaction> {
    return AppDataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(CustomerWallet);
      const transactionRepo = manager.getRepository(WalletTransaction);

      // Check for existing transaction (idempotency)
      if (input.transactionId) {
        const existing = await transactionRepo.findOne({
          where: { transactionId: input.transactionId },
        });
        if (existing) {
          return existing; // Already processed
        }
      }

      // Get or create wallet
      let wallet = await walletRepo.findOne({
        where: { tenantId: input.tenantId, customerId: input.customerId },
      });

      if (!wallet) {
        wallet = walletRepo.create({
          tenantId: input.tenantId,
          customerId: input.customerId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
        });
        wallet = await walletRepo.save(wallet);
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + input.amount;

      // Update wallet
      wallet.balance = balanceAfter;
      wallet.totalEarned += input.amount;
      await walletRepo.save(wallet);

      // Create transaction record
      const transaction = transactionRepo.create({
        walletId: wallet.id,
        tenantId: input.tenantId,
        customerId: input.customerId,
        type: WalletTransactionType.CREDIT,
        source: input.source,
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        description: input.description,
        reservationId: input.reservationId,
        transactionId: input.transactionId,
        adminUserId: input.adminUserId,
      });

      return transactionRepo.save(transaction);
    });
  }

  /**
   * Debit points from customer wallet
   */
  static async debitPoints(input: DebitPointsInput): Promise<WalletTransaction> {
    return AppDataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(CustomerWallet);
      const transactionRepo = manager.getRepository(WalletTransaction);

      // Get wallet
      const wallet = await walletRepo.findOne({
        where: { tenantId: input.tenantId, customerId: input.customerId },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.balance < input.amount) {
        throw new Error('Insufficient balance');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - input.amount;

      // Update wallet
      wallet.balance = balanceAfter;
      wallet.totalSpent += input.amount;
      await walletRepo.save(wallet);

      // Create transaction record
      const transaction = transactionRepo.create({
        walletId: wallet.id,
        tenantId: input.tenantId,
        customerId: input.customerId,
        type: WalletTransactionType.DEBIT,
        source: WalletTransactionSource.ADMIN_ADJUSTMENT,
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        description: input.description,
        reason: input.reason,
        adminUserId: input.adminUserId,
      });

      return transactionRepo.save(transaction);
    });
  }

  /**
   * Get wallet transactions
   */
  static async getTransactions(
    tenantId: string,
    customerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const wallet = await this.getWallet(tenantId, customerId);
    if (!wallet) {
      return { transactions: [], total: 0 };
    }

    const [transactions, total] = await this.transactionRepo().findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['reservation'],
    });

    return { transactions, total };
  }
}


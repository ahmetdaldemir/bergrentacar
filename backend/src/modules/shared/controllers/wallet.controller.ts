import { Response } from 'express';
import { WalletService, CreditPointsInput, DebitPointsInput } from '../services/wallet.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { WalletTransactionSource } from '../entities/wallet-transaction.entity';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError, NotFoundError } from '../../../utils/errors';

export class WalletController {
  static getWallet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { customerId } = req.params;
    const wallet = await WalletService.getWallet(tenantId, customerId);
    if (!wallet) throw new NotFoundError('Wallet', customerId);
    sendSuccess(res, wallet);
  });

  static getTransactions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { customerId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await WalletService.getTransactions(tenantId, customerId, limit, offset);
    sendSuccess(res, { transactions: result.transactions, total: result.total });
  });

  static creditPoints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const userId = req.auth?.sub;
    if (!tenantId || !userId) throw new UnauthorizedError('Authentication required');
    const { customerId } = req.params;
    const { amount, description, source } = req.body;
    if (!amount || amount <= 0) throw new ValidationError('Invalid amount');
    const input: CreditPointsInput = {
      tenantId,
      customerId,
      amount: parseFloat(amount),
      source: source || WalletTransactionSource.ADMIN_ADJUSTMENT,
      description,
      adminUserId: userId,
    };
    const transaction = await WalletService.creditPoints(input);
    sendSuccess(res, transaction);
  });

  static debitPoints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const userId = req.auth?.sub;
    if (!tenantId || !userId) throw new UnauthorizedError('Authentication required');
    const { customerId } = req.params;
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) throw new ValidationError('Invalid amount');
    if (!reason) throw new ValidationError('Reason is required');
    const input: DebitPointsInput = { tenantId, customerId, amount: parseFloat(amount), reason, adminUserId: userId };
    const transaction = await WalletService.debitPoints(input);
    sendSuccess(res, transaction);
  });

  static adjustWallet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const userId = req.auth?.sub;
    if (!tenantId || !userId) throw new UnauthorizedError('Authentication required');
    const { customerId } = req.params;
    const { type, amount, reason, description } = req.body;
    if (!type || !['credit', 'debit'].includes(type)) throw new ValidationError('Invalid type. Must be "credit" or "debit"');
    if (!amount || amount <= 0) throw new ValidationError('Invalid amount');
    if (!reason) throw new ValidationError('Reason is required');
    let transaction;
    if (type === 'credit') {
      const input: CreditPointsInput = { tenantId, customerId, amount: parseFloat(amount), source: WalletTransactionSource.ADMIN_ADJUSTMENT, description, adminUserId: userId };
      transaction = await WalletService.creditPoints(input);
    } else {
      const input: DebitPointsInput = { tenantId, customerId, amount: parseFloat(amount), reason, adminUserId: userId };
      transaction = await WalletService.debitPoints(input);
    }
    sendSuccess(res, transaction);
  });
}


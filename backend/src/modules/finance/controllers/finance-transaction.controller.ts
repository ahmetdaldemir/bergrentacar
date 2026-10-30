import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError } from '../../../utils/errors';
import { FinanceTransactionService } from '../services/finance-transaction.service';
import { ReservationFinanceService } from '../services/reservation-finance.service';
import { FinanceTransactionType, FinanceTransactionStatus } from '../entities/finance-transaction.entity';

export class FinanceTransactionController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const filters: any = {};
    if (req.query.type) filters.type = req.query.type as FinanceTransactionType;
    if (req.query.from) filters.from = new Date(req.query.from as string);
    if (req.query.to) filters.to = new Date(req.query.to as string);
    if (req.query.categoryId) filters.categoryId = req.query.categoryId as string;
    if (req.query.cariId) filters.cariId = req.query.cariId as string;
    if (req.query.status) filters.status = req.query.status as FinanceTransactionStatus;
    if (req.query.reservationId) filters.reservationId = req.query.reservationId as string;
    if (req.query.transferReservationId) filters.transferReservationId = req.query.transferReservationId as string;

    const transactions = await FinanceTransactionService.list(tenantId, filters);
    sendSuccess(res, transactions);
  });

  /** GET /finance/transactions/by-reservation/:reservationId */
  static listByReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { reservationId } = req.params;
    const transactions = await ReservationFinanceService.listForReservation(reservationId, tenantId);
    sendSuccess(res, transactions);
  });

  /** GET /finance/transactions/by-transfer-reservation/:transferReservationId */
  static listByTransferReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { transferReservationId } = req.params;
    const transactions = await ReservationFinanceService.listForTransferReservation(transferReservationId, tenantId);
    sendSuccess(res, transactions);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const transaction = await FinanceTransactionService.getById(id, tenantId);
    if (!transaction) throw new NotFoundError('Transaction', id);
    sendSuccess(res, transaction);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const transaction = await FinanceTransactionService.create({ ...req.body, tenantId });
    sendSuccess(res, transaction, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const transaction = await FinanceTransactionService.update(id, tenantId, req.body);
    sendSuccess(res, transaction);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    await FinanceTransactionService.remove(id, tenantId);
    res.status(204).send();
  });
}


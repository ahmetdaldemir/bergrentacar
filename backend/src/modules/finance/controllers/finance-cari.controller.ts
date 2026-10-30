import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError } from '../../../utils/errors';
import { FinanceCariService } from '../services/finance-cari.service';

export class FinanceCariController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const search = req.query.search as string | undefined;
    const cariler = await FinanceCariService.list(tenantId, search);
    sendSuccess(res, cariler);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const cari = await FinanceCariService.getById(id, tenantId);
    if (!cari) throw new NotFoundError('Cari', id);
    sendSuccess(res, cari);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const cari = await FinanceCariService.create({ ...req.body, tenantId });
    sendSuccess(res, cari, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const cari = await FinanceCariService.update(id, tenantId, req.body);
    sendSuccess(res, cari);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    await FinanceCariService.remove(id, tenantId);
    res.status(204).send();
  });

  /** GET /finance/cari/:id/balance */
  static getBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const result = await FinanceCariService.getBalance(id, tenantId);
    if (!result) throw new NotFoundError('Cari', id);
    sendSuccess(res, result);
  });

  /** GET /finance/cari/by-email?email=... */
  static getByEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const email = req.query.email as string;
    if (!email) throw new Error('email query parametresi gereklidir');

    const repo = (await import('../../../config/data-source')).AppDataSource.getRepository(
      (await import('../entities/finance-cari.entity')).FinanceCari
    );
    const cari = await repo.findOne({ where: { tenantId, email } });
    if (!cari) throw new NotFoundError('Cari', email);
    sendSuccess(res, cari);
  });
}


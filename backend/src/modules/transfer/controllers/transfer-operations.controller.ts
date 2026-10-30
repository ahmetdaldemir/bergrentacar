import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, UnauthorizedError } from '../../../utils/errors';
import { getTenantIdFromAuth } from '../../../utils/validation';
import { TransferOperationsService } from '../services/transfer-operations.service';

function requireTenantId(req: Request): string {
  const tenantId = getTenantIdFromAuth(req);
  if (!tenantId) throw new UnauthorizedError('Authentication required');
  return tenantId;
}

export class TransferOperationsController {
  static availability = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const snapshot = await TransferOperationsService.getAvailabilitySnapshot(tenantId);
    sendSuccess(res, snapshot);
  });
}

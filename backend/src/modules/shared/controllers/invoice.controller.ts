import { Request, Response } from 'express';
import { InvoiceService } from '../services/invoice/invoice.service';
import { ReservationInvoiceConfigService } from '../services/invoice/invoice-config.service';
import { IntegratorRegistry } from '../services/invoice/integrator-registry';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from '../../../utils/errors';

export class InvoiceController {
  static issueInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const { reservationId, transferReservationId, forceReissue } = req.body;
    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const userId = req.auth.sub || 'unknown';
    if (!reservationId && !transferReservationId) throw new ValidationError('reservationId veya transferReservationId gereklidir');
    if (req.auth.role !== 'admin') throw new ForbiddenError('Only admins can issue invoices');
    const invoice = await InvoiceService.issueInvoice({ reservationId, transferReservationId, tenantId, userId, forceReissue: forceReissue === true });
    sendSuccess(res, invoice);
  });

  static getInvoiceByReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const { reservationId } = req.params;
    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const invoice = await InvoiceService.getInvoiceByReservation(reservationId, tenantId);
    if (!invoice) throw new NotFoundError('Invoice', reservationId);
    sendSuccess(res, invoice);
  });

  static getInvoiceByTransferReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const { transferReservationId } = req.params;
    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const invoice = await InvoiceService.getInvoiceByTransferReservation(transferReservationId, tenantId);
    if (!invoice) throw new NotFoundError('Invoice', transferReservationId);
    sendSuccess(res, invoice);
  });

  static getInvoices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await InvoiceService.getInvoicesByTenant(tenantId, limit, offset);
    sendSuccess(res, result);
  });

  static getIntegratorConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    const { integratorKey } = req.params;
    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const config = await ReservationInvoiceConfigService.getConfig(tenantId, integratorKey);
    const payload = config ? InvoiceController.maskSensitiveFields(config) : {};
    sendSuccess(res, payload);
  });

  static saveIntegratorConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');
    if (req.auth.role !== 'admin') throw new ForbiddenError('Only admins can save integrator config');
    const { integratorKey } = req.params;
    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const configData = req.body;
    const config = await ReservationInvoiceConfigService.saveConfig(tenantId, integratorKey, configData);
    const maskedConfig = InvoiceController.maskSensitiveFields(config.configData);
    sendSuccess(res, maskedConfig);
  });

  static getAvailableIntegrators = asyncHandler(async (req: Request, res: Response) => {
    const integrators = IntegratorRegistry.getAvailableIntegrators();
    sendSuccess(res, { integrators });
  });

  private static maskSensitiveFields(config: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['apiKey', 'api_key', 'password', 'secret', 'token', 'accessToken'];
    const masked = { ...config };

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        if (typeof masked[key] === 'string' && (masked[key] as string).length > 0) {
          masked[key] = '***';
        }
      }
    }

    return masked;
  }
}


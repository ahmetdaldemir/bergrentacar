import { Response } from 'express';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler } from '../../../utils/errors';
import {
  TransferDiscountCodeService,
  CreateDiscountCodeInput,
} from '../services/transfer-discount-code.service';
import { DiscountType, DiscountCodeStatus } from '../entities/transfer-discount-code.entity';

// ─── Rate limiter (bellek tabanlı, production için express-rate-limit önerilir) ──
const makeRateLimiter = (windowMs: number, max: number) => {
  const map = new Map<string, { count: number; reset: number }>();
  return (req: any, res: any, next: any) => {
    const key = (req.ip as string) || 'unknown';
    const now = Date.now();
    const rec = map.get(key);
    if (!rec || now > rec.reset) {
      map.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (rec.count >= max) {
      return res.status(429).json({ success: false, error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' });
    }
    rec.count++;
    next();
  };
};

export const validateRateLimiter = makeRateLimiter(15 * 60 * 1000, 30); // 15 dk'da 30 istek

// ─── Controller ──────────────────────────────────────────────────────────────

export class TransferDiscountCodeController {

  // ── Admin: list ──────────────────────────────────────────────────────────

  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const status = req.query.status as DiscountCodeStatus | undefined;
    const customerEmail = req.query.customerEmail as string | undefined;

    const codes = await TransferDiscountCodeService.list(tenantId, { status, customerEmail });
    return res.json({ success: true, data: codes });
  });

  // ── Admin: get by ID ─────────────────────────────────────────────────────

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const dc = await TransferDiscountCodeService.getById(req.params.id, tenantId);
    if (!dc) return res.status(404).json({ success: false, error: 'Discount code not found' });

    return res.json({ success: true, data: dc });
  });

  // ── Admin: get by code ───────────────────────────────────────────────────

  static getByCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const dc = await TransferDiscountCodeService.getByCode(req.params.code, tenantId);
    if (!dc) return res.status(404).json({ success: false, error: 'Discount code not found' });

    return res.json({ success: true, data: dc });
  });

  // ── Admin: create ────────────────────────────────────────────────────────

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const userId = req.auth?.sub;
    if (!tenantId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const body = req.body as Partial<CreateDiscountCodeInput>;

    if (!body.discountType || !Object.values(DiscountType).includes(body.discountType)) {
      return res.status(400).json({
        success: false,
        error: `discountType must be one of: ${Object.values(DiscountType).join(', ')}`,
      });
    }

    if (!body.discountValue || Number(body.discountValue) <= 0) {
      return res.status(400).json({ success: false, error: 'discountValue must be a positive number' });
    }

    const input: CreateDiscountCodeInput = {
      tenantId,
      createdByUserId: userId,
      code: body.code,
      discountType: body.discountType,
      discountValue: Number(body.discountValue),
      currencyCode: body.currencyCode,
      maxDiscountAmount: body.maxDiscountAmount != null ? Number(body.maxDiscountAmount) : null,
      minOrderAmount: body.minOrderAmount != null ? Number(body.minOrderAmount) : null,
      customerEmail: body.customerEmail ?? null,
      customerName: body.customerName ?? null,
      expiresAt: body.expiresAt ?? null,
      description: body.description ?? null,
    };

    const dc = await TransferDiscountCodeService.create(input);
    return res.status(201).json({ success: true, data: dc });
  });

  // ── Admin: cancel ────────────────────────────────────────────────────────

  static cancel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const dc = await TransferDiscountCodeService.cancel(req.params.id, tenantId);
    return res.json({ success: true, data: dc });
  });

  // ── Admin: delete ────────────────────────────────────────────────────────

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, error: 'Authentication required' });

    await TransferDiscountCodeService.delete(req.params.id, tenantId);
    return res.status(204).send();
  });

  // ── Admin: usage history ─────────────────────────────────────────────────

  static usages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const usages = await TransferDiscountCodeService.listUsages(req.params.id, tenantId);
    return res.json({ success: true, data: usages });
  });

  // ── Public: e-posta adresine tanımlı kodları listele (tenant sitesinden) ───

  static listByCustomerEmail = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id || (req.query.tenantId as string);
    if (!tenantId) return res.status(400).json({ success: false, error: 'tenantId is required' });

    const customerEmail = (req.query.customerEmail as string)?.trim();
    if (!customerEmail) return res.status(400).json({ success: false, error: 'customerEmail is required' });

    const codes = await TransferDiscountCodeService.listByCustomerEmail(tenantId, customerEmail);

    const data = codes.map((dc) => ({
      code: dc.code,
      discountType: dc.discountType,
      discountValue: Number(dc.discountValue),
      currencyCode: dc.currencyCode,
      maxDiscountAmount: dc.maxDiscountAmount ? Number(dc.maxDiscountAmount) : null,
      minOrderAmount: dc.minOrderAmount ? Number(dc.minOrderAmount) : null,
      status: dc.status,
      expiresAt: dc.expiresAt,
      isUsed: dc.isUsed,
      usedAt: dc.usedAt,
    }));

    return res.json({ success: true, data });
  });

  // ── Public: validate (anlık sorgu) ──────────────────────────────────────

  static validate = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id || (req.query.tenantId as string);
    if (!tenantId) return res.status(400).json({ success: false, error: 'tenantId is required' });

    const code = req.query.code as string;
    if (!code) return res.status(400).json({ success: false, error: 'code is required' });

    const orderTotal = req.query.orderTotal ? Number(req.query.orderTotal) : undefined;
    const customerEmail = req.query.customerEmail as string | undefined;

    const result = await TransferDiscountCodeService.validate({
      tenantId,
      code,
      orderTotal,
      customerEmail,
    });

    if (!result.valid) {
      return res.status(400).json({ success: false, valid: false, error: result.error });
    }

    const dc = result.discountCode!;

    return res.json({
      success: true,
      valid: true,
      data: {
        code: dc.code,
        discountType: dc.discountType,
        discountValue: Number(dc.discountValue),
        currencyCode: dc.currencyCode,
        maxDiscountAmount: dc.maxDiscountAmount ? Number(dc.maxDiscountAmount) : null,
        minOrderAmount: dc.minOrderAmount ? Number(dc.minOrderAmount) : null,
        customerEmail: dc.customerEmail,
        customerName: dc.customerName,
        expiresAt: dc.expiresAt,
        discountAmount: result.discountAmount,   // orderTotal verilmişse hesaplanmış tutar
        discountPercent: result.discountPercent, // PERCENTAGE tipinde yüzde değeri
      },
    });
  });

  // ── Public: redeem ───────────────────────────────────────────────────────

  static redeem = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as any).tenant?.id || (req.body.tenantId as string);
    if (!tenantId) return res.status(400).json({ success: false, error: 'tenantId is required' });

    const { code, orderTotal, customerEmail, transferRequestId } = req.body;

    if (!code) return res.status(400).json({ success: false, error: 'code is required' });
    if (!orderTotal || Number(orderTotal) <= 0) {
      return res.status(400).json({ success: false, error: 'orderTotal is required and must be positive' });
    }

    const result = await TransferDiscountCodeService.redeem({
      tenantId,
      code,
      orderTotal: Number(orderTotal),
      customerEmail,
      transferRequestId,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || undefined,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, valid: false, error: result.error });
    }

    return res.json({ success: true, data: { discountAmount: result.discountAmount } });
  });
}

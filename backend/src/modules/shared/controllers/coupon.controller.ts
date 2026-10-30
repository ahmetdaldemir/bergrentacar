import { Response } from 'express';
import { CouponService, CreateCouponInput, ValidateCouponInput, RedeemCouponInput } from '../services/coupon.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError, NotFoundError } from '../../../utils/errors';

export class CouponController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { status, customerId, isUsed } = req.query;
    const coupons = await CouponService.listCoupons(tenantId, {
      status: status as any,
      customerId: customerId as string,
      isUsed: isUsed === 'true' ? true : isUsed === 'false' ? false : undefined,
    });
    sendSuccess(res, coupons);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const userId = req.auth?.sub;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const input: CreateCouponInput = {
      tenantId,
      customerId: req.body.customerId,
      value: parseFloat(req.body.value),
      currencyCode: req.body.currencyCode || 'TRY',
      expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      isSingleUse: req.body.isSingleUse !== false,
      description: req.body.description,
      createdByUserId: userId,
    };
    if (!input.value || input.value <= 0) throw new ValidationError('Invalid coupon value');
    const coupon = await CouponService.createCouponFromPoints(input);
    sendSuccess(res, coupon, 201);
  });

  static validate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId ?? req.body.tenantId;
    if (!tenantId) throw new ValidationError('tenantId is required (authenticate or provide in body for public flow)');
    const input: ValidateCouponInput = {
      tenantId,
      code: req.body.code,
      customerId: req.body.customerId,
      reservationTotal: req.body.reservationTotal ? parseFloat(req.body.reservationTotal) : undefined,
    };
    if (!input.code) throw new ValidationError('Coupon code is required');
    const result = await CouponService.validateCoupon(input);
    if (!result.valid) throw new ValidationError(result.error || 'Invalid coupon');
    sendSuccess(res, { valid: true, coupon: result.coupon, discountAmount: result.discountAmount });
  });

  static redeem = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId ?? req.body.tenantId;
    if (!tenantId) throw new ValidationError('tenantId is required (authenticate or provide in body for public flow)');
    const input: RedeemCouponInput = {
      tenantId,
      code: req.body.code,
      reservationId: req.body.reservationId,
      reservationTotal: parseFloat(req.body.reservationTotal),
      customerId: req.body.customerId,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    };
    if (!input.code) throw new ValidationError('Coupon code is required');
    if (!input.reservationId) throw new ValidationError('reservationId is required');
    if (!input.reservationTotal || input.reservationTotal <= 0) throw new ValidationError('Invalid reservation total');
    const result = await CouponService.redeemCoupon(input);
    if (!result.success) throw new ValidationError(result.error || 'Redeem failed');
    sendSuccess(res, { coupon: result.coupon, discountAmount: result.discountAmount });
  });

  static getByCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { code } = req.params;
    const coupon = await CouponService.getCouponByCode(tenantId, code);
    if (!coupon) throw new NotFoundError('Coupon', code);
    sendSuccess(res, coupon);
  });
}


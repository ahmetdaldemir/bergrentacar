import { Response } from 'express';
import { CustomerAuthService } from '../services/customer-auth.service';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { CustomerAuthenticatedRequest } from '../middleware/customer-auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError, ForbiddenError } from '../../../utils/errors';

export class CustomerAuthController {
  static login = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { email, idNumber, password, tenantId: bodyTenantId } = req.body;
    if (!password) throw new ValidationError('Password is required');
    if (!email && !idNumber) throw new ValidationError('Email or ID number is required');
    if (req.tenant?.id && bodyTenantId && req.tenant.id !== bodyTenantId) {
      throw new ForbiddenError('tenantId in body does not match this tenant subdomain');
    }
    const tenantId = req.tenant?.id || bodyTenantId;
    if (!tenantId) throw new ValidationError('Tenant not found. Use tenant subdomain or pass tenantId in body.');
    const result = await CustomerAuthService.login({ tenantId, email, idNumber, password });
    sendSuccess(res, {
      token: result.token,
      customer: {
        id: result.customer.id, firstName: result.customer.firstName, lastName: result.customer.lastName,
        fullName: result.customer.fullName, email: result.customer.email, mobilePhone: result.customer.mobilePhone,
        country: result.customer.country, languageId: result.customer.languageId,
        isActive: result.customer.isActive, tenantId: result.customer.tenantId,
      },
      tenant: result.tenant,
    });
  });

  static me = asyncHandler(async (req: CustomerAuthenticatedRequest, res: Response) => {
    if (!req.customerAuth) throw new UnauthorizedError('Unauthorized');
    const profile = await CustomerAuthService.getProfile(req.customerAuth.customerId, req.customerAuth.tenantId);
    sendSuccess(res, {
      customer: {
        id: profile.customer.id, firstName: profile.customer.firstName, lastName: profile.customer.lastName,
        fullName: profile.customer.fullName, email: profile.customer.email, mobilePhone: profile.customer.mobilePhone,
        homePhone: profile.customer.homePhone, country: profile.customer.country, birthDate: profile.customer.birthDate,
        gender: profile.customer.gender, languageId: profile.customer.languageId, homeAddress: profile.customer.homeAddress,
        idType: profile.customer.idType, idNumber: profile.customer.idNumber, licenseNumber: profile.customer.licenseNumber,
        licenseClass: profile.customer.licenseClass, isActive: profile.customer.isActive, tenantId: profile.customer.tenantId,
      },
      tenant: profile.tenant,
      wallet: profile.wallet,
    });
  });

  static myReservations = asyncHandler(async (req: CustomerAuthenticatedRequest, res: Response) => {
    if (!req.customerAuth) throw new UnauthorizedError('Unauthorized');
    const { reservations, transferReservations } = await CustomerAuthService.getCustomerReservations(
      req.customerAuth.customerId,
      req.customerAuth.tenantId
    );
    sendSuccess(res, { reservations, transferReservations });
  });

  static changePassword = asyncHandler(async (req: CustomerAuthenticatedRequest, res: Response) => {
    if (!req.customerAuth) throw new UnauthorizedError('Unauthorized');
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new ValidationError('Current password and new password are required');
    if (newPassword.length < 6) throw new ValidationError('New password must be at least 6 characters');
    await CustomerAuthService.changePassword(
      req.customerAuth.customerId,
      req.customerAuth.tenantId,
      currentPassword,
      newPassword
    );
    sendSuccess(res, { message: 'Password changed successfully' });
  });

  static logout = asyncHandler(async (req: CustomerAuthenticatedRequest, res: Response) => {
    sendSuccess(res, { message: 'Logged out successfully' });
  });

  static forgotPassword = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { email, idNumber, tenantId: bodyTenantId } = req.body;
    if (!email && !idNumber) throw new ValidationError('Email or ID number is required');
    if (req.tenant?.id && bodyTenantId && req.tenant.id !== bodyTenantId) {
      throw new ForbiddenError('tenantId in body does not match this tenant subdomain');
    }
    const tenantId = req.tenant?.id || bodyTenantId;
    if (!tenantId) throw new ValidationError('Tenant not found. Use tenant subdomain or pass tenantId in body.');
    try {
      const result = await CustomerAuthService.forgotPassword(tenantId, email, idNumber);
      try {
        const { sendPasswordResetEmail } = await import('../../../services/customer-email.service');
        await sendPasswordResetEmail(result.customer, result.token);
      } catch (err) {
        console.error('Failed to send password reset email:', err);
      }
    } catch (_) {
      // Security: don't reveal if customer exists
    }
    sendSuccess(res, { message: 'If an account exists with this email/ID, a password reset link has been sent' });
  });

  static resetPassword = asyncHandler(async (req: TenantRequest, res: Response) => {
    const { token, newPassword, tenantId: bodyTenantId } = req.body;
    if (!token) throw new ValidationError('Reset token is required');
    if (!newPassword) throw new ValidationError('New password is required');
    if (newPassword.length < 6) throw new ValidationError('New password must be at least 6 characters');
    if (req.tenant?.id && bodyTenantId && req.tenant.id !== bodyTenantId) {
      throw new ForbiddenError('tenantId in body does not match this tenant subdomain');
    }
    const tenantId = req.tenant?.id || bodyTenantId;
    if (!tenantId) throw new ValidationError('Tenant not found. Use tenant subdomain or pass tenantId in body.');
    await CustomerAuthService.resetPassword(tenantId, token, newPassword);
    sendSuccess(res, { message: 'Password reset successfully' });
  });
}


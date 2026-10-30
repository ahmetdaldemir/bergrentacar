import { Request, Response } from 'express';
import { AdminAuthService } from '../services/admin-auth.service';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError } from '../../../utils/errors';

export class AdminAuthController {
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) throw new ValidationError('username and password are required');
    const result = await AdminAuthService.login({ username, password });
    sendSuccess(res, result);
  });

  static me = asyncHandler(async (req: Request, res: Response) => {
    const auth = (req as any).auth;
    if (!auth || auth.type !== 'admin') throw new UnauthorizedError('Unauthorized');
    const result = await AdminAuthService.getProfile(auth.sub);
    sendSuccess(res, result);
  });
}


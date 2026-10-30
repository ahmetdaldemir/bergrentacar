import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { loadEnv } from '../../../config/env';
import { UnauthorizedError } from '../../../utils/errors';

const env = loadEnv();

export interface AdminAuthRequest extends Request {
  auth?: {
    sub: string;
    type: 'admin';
  };
}

export function authenticateAdmin(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.auth.jwtSecret) as any;

    if (decoded.type !== 'admin') {
      throw new UnauthorizedError('Invalid token type');
    }

    req.auth = {
      sub: decoded.sub,
      type: 'admin',
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid token'));
    }
    next(error);
  }
}


/**
 * Customer Authentication Middleware
 * Verifies JWT token for customer endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { loadEnv } from '../../../config/env';
import { logger } from '../../../utils/logger';

const env = loadEnv();

export interface CustomerAuthPayload {
  sub: string;
  customerId: string;
  tenantId: string;
  type: 'customer';
  email?: string;
  fullName?: string;
}

export interface CustomerAuthenticatedRequest extends Request {
  customerAuth?: CustomerAuthPayload;
}

/**
 * Customer Authentication Middleware
 * Verifies JWT token and sets req.customerAuth
 */
export const customerAuthenticate = async (
  req: CustomerAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization token required',
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, env.auth.jwtSecret) as CustomerAuthPayload;

      // Verify token type is customer
      if (decoded.type !== 'customer') {
        logger.warn('Invalid token type for customer endpoint', { type: decoded.type });
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid token type',
          },
        });
        return;
      }

      req.customerAuth = decoded;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired',
          },
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid token',
          },
        });
        return;
      }

      throw error;
    }
  } catch (error) {
    logger.error('Error in customer authentication middleware', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
    return;
  }
};


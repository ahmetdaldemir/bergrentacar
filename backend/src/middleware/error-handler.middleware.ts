/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and sends standardized responses
 */

import { Request, Response, NextFunction } from 'express';
import { sendErrorResponse, AppError, ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';
import { isCorsOriginAllowed } from '../config/cors-origins';

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Log the error with request context
  logger.error('Unhandled error in request', error, {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  const origin = req.get('Origin');
  if (origin && isCorsOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  // Send standardized error response
  sendErrorResponse(res, error);
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    ErrorCode.NOT_FOUND,
    `Route ${req.method} ${req.path} not found`,
    404
  );
  next(error);
};


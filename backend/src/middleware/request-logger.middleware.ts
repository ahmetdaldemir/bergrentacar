/**
 * Request Logging Middleware
 * Logs all HTTP requests with timing information
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      requestStartTime?: number;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  req.requestStartTime = startTime;

  // Log request start
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.httpRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      {
        query: req.query,
        ip: req.ip,
      }
    );

    return originalEnd(chunk, encoding);
  };

  next();
};


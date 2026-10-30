/**
 * Request ID Middleware
 * 
 * Generates unique request IDs for tracing
 * - requestId: unique per request (uuid v4)
 * - correlationId: for tracking related requests (passed via header or same as requestId)
 * 
 * Attaches to request object for later use by loggers and services
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface RequestWithId extends Request {
  requestId?: string;
  correlationId?: string;
  requestStartTime?: number;
}

export const requestIdMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  // Generate or use existing request ID
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Generate or use existing correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || requestId;

  // Attach to request
  req.requestId = requestId;
  req.correlationId = correlationId;
  req.requestStartTime = Date.now();

  // Set response headers
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};


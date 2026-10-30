/**
 * Error Log Middleware
 * 
 * Captures unhandled errors and logs them to activity logs
 * - Records full error details (sanitized)
 * - Includes stack trace (truncated)
 * - Links to request context
 */

import { Request, Response, NextFunction } from 'express';
import { RequestWithId } from './request-id.middleware';
import { AuthenticatedRequest } from '../modules/auth/middleware/auth.middleware';
import { TenantRequest } from './tenant.middleware';
import { ActivityLoggerService } from '../modules/activity-log/services/activity-logger.service';
import { ActivityLogSeverity, ActivityLogStatus, ActorType } from '../modules/activity-log/entities/activity-log.entity';

interface LoggableRequest extends RequestWithId, TenantRequest {
  auth?: any; // Can be AuthTokenPayload or CustomerAuthTokenPayload
}

/**
 * Extract actor info from request
 */
function extractActor(req: LoggableRequest): {
  type?: ActorType;
  id?: string;
  label?: string;
} | undefined {
  if (!req.auth) {
    return undefined;
  }

  // Check if it's a customer auth token
  if (req.auth.type === 'customer') {
    return {
      type: ActorType.CUSTOMER,
      id: req.auth.customerId || req.auth.sub,
      label: req.auth.email || req.auth.fullName || req.auth.sub,
    };
  }
  
  // Regular user/admin auth
  return {
    type: ActorType.USER,
    id: req.auth.sub,
    label: req.auth.email || req.auth.username || req.auth.sub,
  };
}

/**
 * Get client IP address
 */
function getClientIp(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress
  );
}

/**
 * Error Log Middleware
 * 
 * IMPORTANT: This should be added AFTER the standard error handler
 * to capture errors that weren't handled by business logic
 */
export const errorLogMiddleware = (
  error: any,
  req: LoggableRequest,
  res: Response,
  next: NextFunction
): void => {
  // Extract error details
  const errorCode = error.code || error.name || 'UNKNOWN_ERROR';
  const errorMessage = error.message || 'An unexpected error occurred';
  const stackTrace = error.stack;

  // Determine HTTP status
  const httpStatus = error.statusCode || error.status || 500;

  // Calculate duration
  const durationMs = req.requestStartTime ? Date.now() - req.requestStartTime : undefined;

  // Extract actor
  const actor = extractActor(req);

  // Log the error
  ActivityLoggerService.log({
    tenantId: req.tenant?.id || null,
    module: 'api',
    action: 'error',
    severity: ActivityLogSeverity.ERROR,
    status: ActivityLogStatus.FAILURE,
    message: `Unhandled error: ${errorMessage}`,
    actor,
    request: {
      requestId: req.requestId,
      correlationId: req.correlationId,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      httpStatus,
      durationMs,
    },
    metadata: {
      query: req.query,
      bodyKeys: req.body ? Object.keys(req.body) : [],
    },
    error: {
      code: errorCode,
      message: errorMessage,
      stack: stackTrace,
    },
  }).catch((logError) => {
    // Silent fail - don't break error handling flow
    console.error('[ActivityLog] Failed to log error:', logError);
  });

  // Pass error to next error handler
  next(error);
};


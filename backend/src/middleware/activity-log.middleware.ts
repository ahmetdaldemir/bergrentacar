/**
 * Activity Log Middleware
 * 
 * Automatically logs HTTP requests for selected routes
 * - Captures request/response data
 * - Records duration, status, errors
 * - Sanitizes sensitive data
 */

import { Request, Response, NextFunction } from 'express';
import { RequestWithId } from './request-id.middleware';
import { AuthenticatedRequest } from '../modules/auth/middleware/auth.middleware';
import { ActivityLoggerService } from '../modules/activity-log/services/activity-logger.service';
import { ActivityLogSeverity, ActivityLogStatus, ActorType } from '../modules/activity-log/entities/activity-log.entity';
import { TenantRequest } from './tenant.middleware';

interface LoggableRequest extends RequestWithId, TenantRequest {
  auth?: any; // Can be AuthTokenPayload or CustomerAuthTokenPayload
}

/**
 * Routes to log (critical endpoints)
 * Add more patterns as needed
 */
const LOGGABLE_ROUTES = [
  /^\/api\/admin\//,           // All admin routes
  /^\/api\/auth\//,            // Authentication
  /^\/api\/customers\/auth\//, // Customer auth
  /^\/api\/reservations\//,    // Reservations
  /^\/api\/rentacar\/operations\//, // Operations (pickup/return)
  /^\/api\/finance\//,         // Finance
  /^\/api\/wallet\//,          // Wallet
  /^\/api\/coupons\//,         // Coupons
  /^\/api\/invoices\//,        // Invoices
];

/**
 * Check if route should be logged
 */
function shouldLogRoute(path: string): boolean {
  return LOGGABLE_ROUTES.some((pattern) => pattern.test(path));
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

  // Check for customer auth (from CustomerAuthTokenPayload)
  if (req.auth.type === 'customer') {
    return {
      type: ActorType.CUSTOMER,
      id: req.auth.customerId || req.auth.sub,
      label: req.auth.email || req.auth.fullName || req.auth.sub,
    };
  }

  // Authenticated user (admin or tenant user)
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
 * Activity Log Middleware
 * Records request/response for selected routes
 */
export const activityLogMiddleware = (req: LoggableRequest, res: Response, next: NextFunction): void => {
  // Skip if route is not loggable
  if (!shouldLogRoute(req.path)) {
    return next();
  }

  // Skip health checks
  if (req.path === '/health') {
    return next();
  }

  const startTime = req.requestStartTime || Date.now();

  // Capture response
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (body: any): Response {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Log after response
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const httpStatus = res.statusCode;

    // Determine severity based on status code
    let severity: ActivityLogSeverity = ActivityLogSeverity.INFO;
    if (httpStatus >= 500) {
      severity = ActivityLogSeverity.ERROR;
    } else if (httpStatus >= 400) {
      severity = ActivityLogSeverity.WARN;
    }

    // Determine status
    const status = httpStatus >= 400 ? ActivityLogStatus.FAILURE : ActivityLogStatus.SUCCESS;

    // Extract actor
    const actor = extractActor(req);

    // Log the request
    ActivityLoggerService.log({
      tenantId: req.tenant?.id || null,
      module: 'api',
      action: 'request',
      severity,
      status,
      message: `${req.method} ${req.path} - ${httpStatus}`,
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
        // Don't log full body (too large), log summary only
        bodyKeys: req.body ? Object.keys(req.body) : [],
      },
    }).catch((error) => {
      // Silent fail - don't break request flow
      console.error('[ActivityLog] Failed to log request:', error);
    });
  });

  next();
};


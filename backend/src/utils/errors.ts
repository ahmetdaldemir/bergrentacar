/**
 * Standardized Error Handling
 * Custom error classes and error response utilities
 */

import { Response } from 'express';
import { logger } from './logger';

export enum ErrorCode {
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Business logic errors
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  INVALID_INPUT = 'INVALID_INPUT',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  /** tenant_settings.google_maps_api_key boş; Ayarlar’dan tanımlanmalı */
  GOOGLE_MAPS_API_KEY_REQUIRED = 'GOOGLE_MAPS_API_KEY_REQUIRED',
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
  };
}

/** Standart başarı cevabı: { success: true, data } */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Standart başarı cevabı gönderir. Controller'lar sadece bunu kullansın.
 */
export const sendSuccess = <T>(res: Response, data: T, statusCode: number = 200): void => {
  const response: SuccessResponse<T> = { success: true, data };
  res.status(statusCode).json(response);
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(ErrorCode.FORBIDDEN, message, 403);
  }
}

export class DuplicateEntryError extends AppError {
  constructor(resource: string, field: string, value: string) {
    super(
      ErrorCode.DUPLICATE_ENTRY,
      `${resource} with ${field} '${value}' already exists`,
      409,
      { resource, field, value }
    );
  }
}

/**
 * Standard error response handler
 */
export const sendErrorResponse = (res: Response, error: Error | AppError): void => {
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
    };

    logger.error(`Error ${error.code}: ${error.message}`, error, {
      statusCode: error.statusCode,
      details: error.details,
    });

    res.status(error.statusCode).json(response);
  } else {
    // Service-thrown Error: map "not found" messages to 404
    const msg = error.message || '';
    const isNotFound = msg.toLowerCase().includes('not found');
    const statusCode = isNotFound ? 404 : 500;
    const code = isNotFound ? ErrorCode.NOT_FOUND : ErrorCode.INTERNAL_ERROR;
    const response: ErrorResponse = {
      success: false,
      error: {
        code,
        message: process.env.NODE_ENV === 'production' && statusCode === 500
          ? 'An internal server error occurred'
          : msg || 'An internal server error occurred',
        timestamp: new Date().toISOString(),
      },
    };

    logger.error(isNotFound ? `Not found: ${msg}` : 'Unexpected error', error, {
      stack: statusCode === 500 ? error.stack : undefined,
    });

    res.status(statusCode).json(response);
  }
};

/** sendErrorResponse ile aynı; isim tutarlılığı için alias */
export const sendError = sendErrorResponse;

/**
 * Async handler wrapper to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      sendErrorResponse(res, error);
    });
  };
};


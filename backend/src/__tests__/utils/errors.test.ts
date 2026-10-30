/**
 * Unit Tests for Error Utilities
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  DuplicateEntryError,
  ErrorCode,
  asyncHandler,
} from '../../utils/errors';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create an AppError with all properties', () => {
      const error = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Test error message',
        500,
        { detail: 'extra info' },
        true
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ detail: 'extra info' });
      expect(error.isOperational).toBe(true);
    });

    it('should use default values when optional params are not provided', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed');

      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError(ErrorCode.INTERNAL_ERROR, 'Test');
      expect(error.stack).toBeDefined();
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with correct defaults', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should accept details parameter', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Invalid input', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('NotFoundError', () => {
    it('should create NotFoundError with resource only', () => {
      const error = new NotFoundError('User');

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should create NotFoundError with resource and identifier', () => {
      const error = new NotFoundError('User', 'user-123');

      expect(error.message).toBe("User with identifier 'user-123' not found");
    });
  });

  describe('UnauthorizedError', () => {
    it('should create UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized access');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Token expired');

      expect(error.message).toBe('Token expired');
    });
  });

  describe('ForbiddenError', () => {
    it('should create ForbiddenError with default message', () => {
      const error = new ForbiddenError();

      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden access');
    });

    it('should accept custom message', () => {
      const error = new ForbiddenError('Insufficient permissions');

      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('DuplicateEntryError', () => {
    it('should create DuplicateEntryError with all details', () => {
      const error = new DuplicateEntryError('User', 'email', 'test@example.com');

      expect(error.code).toBe(ErrorCode.DUPLICATE_ENTRY);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("User with email 'test@example.com' already exists");
      expect(error.details).toEqual({
        resource: 'User',
        field: 'email',
        value: 'test@example.com',
      });
    });
  });

  describe('asyncHandler', () => {
    it('should call the handler function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const handler = asyncHandler(mockFn);
      const mockReq = {} as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const mockNext = jest.fn();

      await handler(mockReq, mockRes, mockNext);

      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should catch and handle errors', async () => {
      const testError = new ValidationError('Test error');
      const mockFn = jest.fn().mockRejectedValue(testError);
      const handler = asyncHandler(mockFn);
      const mockReq = {} as any;
      const mockRes = { 
        status: jest.fn().mockReturnThis(), 
        json: jest.fn() 
      } as any;
      const mockNext = jest.fn();

      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('ErrorCode enum', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCode.DUPLICATE_ENTRY).toBe('DUPLICATE_ENTRY');
      expect(ErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ErrorCode.RESOURCE_CONFLICT).toBe('RESOURCE_CONFLICT');
      expect(ErrorCode.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
    });
  });
});


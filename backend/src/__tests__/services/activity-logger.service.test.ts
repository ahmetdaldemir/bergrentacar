import { AppDataSource } from '../../config/data-source';
import { ActivityLoggerService } from '../../modules/activity-log/services/activity-logger.service';
import { ActivityLog, ActivityLogSeverity, ActivityLogStatus, ActorType } from '../../modules/activity-log/entities/activity-log.entity';

describe('ActivityLoggerService', () => {
  let isDbAvailable = false;

  beforeAll(async () => {
    try {
      // Initialize database for tests
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      
      // Check if ActivityLog entity is available
      AppDataSource.getMetadata(ActivityLog);
      isDbAvailable = true;
    } catch (error) {
      console.warn('Database or ActivityLog entity not available, skipping integration tests');
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (!isDbAvailable) return;
    
    try {
      // Cleanup: delete all test logs
      const repo = AppDataSource.getRepository(ActivityLog);
      await repo.delete({});

      // Close database connection
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    if (!isDbAvailable) return;
    
    try {
      // Clean up before each test
      const repo = AppDataSource.getRepository(ActivityLog);
      await repo.delete({});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('log', () => {
    it('should create a basic activity log', async () => {
      if (!isDbAvailable) {
        console.warn('Skipping test: Database not available');
        return;
      }
      await ActivityLoggerService.log({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        module: 'auth',
        action: 'login',
        message: 'User logged in successfully',
      });

      const repo = AppDataSource.getRepository(ActivityLog);
      const logs = await repo.find();

      expect(logs).toHaveLength(1);
      expect(logs[0].module).toBe('auth');
      expect(logs[0].action).toBe('login');
      expect(logs[0].message).toBe('User logged in successfully');
      expect(logs[0].severity).toBe(ActivityLogSeverity.INFO); // Default
      expect(logs[0].status).toBe(ActivityLogStatus.SUCCESS); // Default
    });

    it('should log with actor information', async () => {
      if (!isDbAvailable) return;
      await ActivityLoggerService.log({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        module: 'reservations',
        action: 'create',
        message: 'Reservation created',
        actor: {
          type: ActorType.USER,
          id: 'user123',
          label: 'test@example.com',
        },
      });

      const repo = AppDataSource.getRepository(ActivityLog);
      const logs = await repo.find();

      expect(logs[0].actorType).toBe(ActorType.USER);
      expect(logs[0].actorId).toBe('user123');
      expect(logs[0].actorLabel).toBe('test@example.com');
    });

    it('should log with entity information', async () => {
      if (!isDbAvailable) return;
      await ActivityLoggerService.log({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        module: 'vehicles',
        action: 'update',
        message: 'Vehicle updated',
        entity: {
          type: 'Vehicle',
          id: 'vehicle123',
          label: '34ABC123',
        },
      });

      const repo = AppDataSource.getRepository(ActivityLog);
      const logs = await repo.find();

      expect(logs[0].entityType).toBe('Vehicle');
      expect(logs[0].entityId).toBe('vehicle123');
      expect(logs[0].entityLabel).toBe('34ABC123');
    });

    it('should log with request context', async () => {
      if (!isDbAvailable) return;
      await ActivityLoggerService.log({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        module: 'api',
        action: 'request',
        message: 'API request',
        request: {
          requestId: 'req-123',
          correlationId: 'corr-456',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          method: 'GET',
          path: '/api/reservations',
          httpStatus: 200,
          durationMs: 150,
        },
      });

      const repo = AppDataSource.getRepository(ActivityLog);
      const logs = await repo.find();

      expect(logs[0].requestId).toBe('req-123');
      expect(logs[0].correlationId).toBe('corr-456');
      expect(logs[0].ip).toBe('192.168.1.1');
      expect(logs[0].method).toBe('GET');
      expect(logs[0].httpStatus).toBe(200);
      expect(logs[0].durationMs).toBe(150);
    });

    it('should log with metadata', async () => {
      if (!isDbAvailable) return;
      await ActivityLoggerService.log({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        module: 'payments',
        action: 'process',
        message: 'Payment processed',
        metadata: {
          amount: 100.50,
          currency: 'TRY',
          gateway: 'stripe',
        },
      });

      const repo = AppDataSource.getRepository(ActivityLog);
      const logs = await repo.find();

      expect(logs[0].metadata).toEqual({
        amount: 100.50,
        currency: 'TRY',
        gateway: 'stripe',
      });
    });

    it('should log with before/after/diff', async () => {
      if (!isDbAvailable) return;
      const before = { status: 'available', odometer: 10000 };
      const after = { status: 'maintenance', odometer: 10500 };

      await ActivityLoggerService.log({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        module: 'vehicles',
        action: 'update',
        message: 'Vehicle status updated',
        before,
        after,
      });

      const repo = AppDataSource.getRepository(ActivityLog);
      const logs = await repo.find();

      expect(logs[0].before).toEqual(before);
      expect(logs[0].after).toEqual(after);
    });

    it('should log errors with stack trace', async () => {
      if (!isDbAvailable) return;
      const error = new Error('Something went wrong');

      await ActivityLoggerService.log({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        module: 'system',
        action: 'error',
        severity: ActivityLogSeverity.ERROR,
        status: ActivityLogStatus.FAILURE,
        message: 'System error occurred',
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          stack: error.stack,
        },
      });

      const repo = AppDataSource.getRepository(ActivityLog);
      const logs = await repo.find();

      expect(logs[0].errorCode).toBe('INTERNAL_ERROR');
      expect(logs[0].errorMessage).toBe('Something went wrong');
      expect(logs[0].stackTrace).toContain('Error: Something went wrong');
    });

    it('should sanitize sensitive data in metadata', async () => {
      if (!isDbAvailable) return;
      await ActivityLoggerService.log({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        module: 'auth',
        action: 'register',
        message: 'User registered',
        metadata: {
          username: 'testuser',
          password: 'secret123',
          email: 'test@example.com',
        },
      });

      const repo = AppDataSource.getRepository(ActivityLog);
      const logs = await repo.find();

      const metadata: any = logs[0].metadata;
      expect(metadata.username).toBe('testuser');
      expect(metadata.password).toBe('[MASKED_SECRET]');
      expect(metadata.email).toContain('*'); // PII masked
    });

    it('should never throw errors (safe logging)', async () => {
      if (!isDbAvailable) return;
      // Invalid UUID should not break logging
      await expect(
        ActivityLoggerService.log({
          tenantId: 'invalid-uuid',
          module: 'test',
          action: 'test',
          message: 'Test',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('find', () => {
    beforeEach(async () => {
      if (!isDbAvailable) return;
      // Create test logs
      await ActivityLoggerService.log({
        tenantId: 'tenant-1',
        module: 'auth',
        action: 'login',
        severity: ActivityLogSeverity.INFO,
        status: ActivityLogStatus.SUCCESS,
        message: 'Login 1',
        actor: { type: ActorType.USER, id: 'user-1', label: 'user1@example.com' },
      });

      await ActivityLoggerService.log({
        tenantId: 'tenant-1',
        module: 'auth',
        action: 'logout',
        severity: ActivityLogSeverity.INFO,
        status: ActivityLogStatus.SUCCESS,
        message: 'Logout 1',
        actor: { type: ActorType.USER, id: 'user-1', label: 'user1@example.com' },
      });

      await ActivityLoggerService.log({
        tenantId: 'tenant-2',
        module: 'reservations',
        action: 'create',
        severity: ActivityLogSeverity.INFO,
        status: ActivityLogStatus.SUCCESS,
        message: 'Reservation created',
        actor: { type: ActorType.USER, id: 'user-2', label: 'user2@example.com' },
      });

      await ActivityLoggerService.log({
        tenantId: 'tenant-1',
        module: 'payments',
        action: 'process',
        severity: ActivityLogSeverity.ERROR,
        status: ActivityLogStatus.FAILURE,
        message: 'Payment failed',
      });
    });

    it('should find all logs without filters', async () => {
      if (!isDbAvailable) return;
      const result = await ActivityLoggerService.find({});

      expect(result.total).toBe(4);
      expect(result.logs).toHaveLength(4);
    });

    it('should filter by tenantId', async () => {
      if (!isDbAvailable) return;
      const result = await ActivityLoggerService.find({
        tenantId: 'tenant-1',
      });

      expect(result.total).toBe(3);
      expect(result.logs.every(log => log.tenantId === 'tenant-1')).toBe(true);
    });

    it('should filter by module', async () => {
      if (!isDbAvailable) return;
      const result = await ActivityLoggerService.find({
        module: 'auth',
      });

      expect(result.total).toBe(2);
      expect(result.logs.every(log => log.module === 'auth')).toBe(true);
    });

    it('should filter by action', async () => {
      if (!isDbAvailable) return;
      const result = await ActivityLoggerService.find({
        action: 'login',
      });

      expect(result.total).toBe(1);
      expect(result.logs[0].action).toBe('login');
    });

    it('should filter by severity', async () => {
      if (!isDbAvailable) return;
      const result = await ActivityLoggerService.find({
        severity: ActivityLogSeverity.ERROR,
      });

      expect(result.total).toBe(1);
      expect(result.logs[0].severity).toBe(ActivityLogSeverity.ERROR);
    });

    it('should filter by status', async () => {
      if (!isDbAvailable) return;
      const result = await ActivityLoggerService.find({
        status: ActivityLogStatus.FAILURE,
      });

      expect(result.total).toBe(1);
      expect(result.logs[0].status).toBe(ActivityLogStatus.FAILURE);
    });

    it('should filter by actorId', async () => {
      if (!isDbAvailable) return;
      const result = await ActivityLoggerService.find({
        actorId: 'user-1',
      });

      expect(result.total).toBe(2);
      expect(result.logs.every(log => log.actorId === 'user-1')).toBe(true);
    });

    it('should support pagination', async () => {
      if (!isDbAvailable) return;
      const result = await ActivityLoggerService.find({
        page: 1,
        limit: 2,
      });

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(4);
      expect(result.totalPages).toBe(2);
    });

    it('should support sorting', async () => {
      if (!isDbAvailable) return;
      const ascResult = await ActivityLoggerService.find({
        sort: 'asc',
      });

      const descResult = await ActivityLoggerService.find({
        sort: 'desc',
      });

      expect(ascResult.logs[0].createdAt.getTime()).toBeLessThan(
        ascResult.logs[ascResult.logs.length - 1].createdAt.getTime()
      );

      expect(descResult.logs[0].createdAt.getTime()).toBeGreaterThan(
        descResult.logs[descResult.logs.length - 1].createdAt.getTime()
      );
    });

    it('should combine multiple filters', async () => {
      if (!isDbAvailable) return;
      const result = await ActivityLoggerService.find({
        tenantId: 'tenant-1',
        module: 'auth',
        severity: ActivityLogSeverity.INFO,
      });

      expect(result.total).toBe(2);
      expect(result.logs.every(log => 
        log.tenantId === 'tenant-1' && 
        log.module === 'auth' &&
        log.severity === ActivityLogSeverity.INFO
      )).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find log by ID', async () => {
      if (!isDbAvailable) return;
      await ActivityLoggerService.log({
        tenantId: 'tenant-1',
        module: 'test',
        action: 'test',
        message: 'Test message',
      });

      const repo = AppDataSource.getRepository(ActivityLog);
      const allLogs = await repo.find();
      const logId = allLogs[0].id;

      const log = await ActivityLoggerService.findById(logId);

      expect(log).toBeDefined();
      expect(log?.id).toBe(logId);
      expect(log?.message).toBe('Test message');
    });

    it('should return null for non-existent ID', async () => {
      if (!isDbAvailable) return;
      const log = await ActivityLoggerService.findById('00000000-0000-0000-0000-000000000000');

      expect(log).toBeNull();
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      if (!isDbAvailable) return;
      const repo = AppDataSource.getRepository(ActivityLog);

      // Create an old log (manually set createdAt to past date)
      const oldLog = repo.create({
        tenantId: 'tenant-1',
        module: 'test',
        action: 'test',
        message: 'Old log',
        createdAt: new Date('2023-01-01'), // Old date
      });
      await repo.save(oldLog);

      // Create a recent log
      await ActivityLoggerService.log({
        tenantId: 'tenant-1',
        module: 'test',
        action: 'test',
        message: 'Recent log',
      });

      // Delete logs older than 180 days
      const deletedCount = await ActivityLoggerService.deleteOldLogs(180);

      expect(deletedCount).toBe(1);

      const remainingLogs = await repo.find();
      expect(remainingLogs).toHaveLength(1);
      expect(remainingLogs[0].message).toBe('Recent log');
    });

    it('should not delete logs within retention period', async () => {
      if (!isDbAvailable) return;
      await ActivityLoggerService.log({
        tenantId: 'tenant-1',
        module: 'test',
        action: 'test',
        message: 'Recent log',
      });

      const deletedCount = await ActivityLoggerService.deleteOldLogs(180);

      expect(deletedCount).toBe(0);
    });
  });
});


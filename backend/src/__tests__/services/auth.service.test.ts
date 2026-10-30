/**
 * Unit Tests for AuthService
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies before importing AuthService
jest.mock('../../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../config/env', () => ({
  loadEnv: jest.fn(() => ({
    auth: {
      jwtSecret: 'test-secret',
      tokenExpiresIn: '1h',
    },
  })),
}));

jest.mock('../../modules/shared/services/tenant-settings.service', () => ({
  TenantSettingsService: {
    getSiteSettings: jest.fn().mockResolvedValue(null),
    getMailSettings: jest.fn().mockResolvedValue(null),
    getPaymentSettings: jest.fn().mockResolvedValue(null),
  },
}));

import { AppDataSource } from '../../config/data-source';
import { AuthService, RegisterInput, LoginInput, SignupInput } from '../../modules/auth/services/auth.service';
import { TenantUserRole } from '../../modules/tenants/entities/tenant-user.entity';
import { TenantCategory } from '../../modules/tenants/entities/tenant.entity';

describe('AuthService', () => {
  let mockUserRepo: any;
  let mockTenantRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock repositories
    mockUserRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockTenantRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const entityName = entity?.name || entity;
      if (entityName === 'TenantUser') return mockUserRepo;
      if (entityName === 'Tenant') return mockTenantRepo;
      return mockUserRepo;
    });
  });

  describe('register', () => {
    const registerInput: RegisterInput = {
      tenantId: 'tenant-123',
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      const mockTenant = { id: 'tenant-123', name: 'Test Tenant' };
      const mockUser = {
        id: 'user-123',
        ...registerInput,
        tenant: mockTenant,
        role: TenantUserRole.ADMIN,
      };

      mockTenantRepo.findOne.mockResolvedValue(mockTenant);
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);

      const result = await AuthService.register(registerInput);

      expect(mockTenantRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tenant-123' } });
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw error when tenant not found', async () => {
      mockTenantRepo.findOne.mockResolvedValue(null);

      await expect(AuthService.register(registerInput)).rejects.toThrow('Tenant not found');
    });

    it('should throw error when user already exists', async () => {
      mockTenantRepo.findOne.mockResolvedValue({ id: 'tenant-123' });
      mockUserRepo.findOne.mockResolvedValue({ id: 'existing-user', email: 'test@example.com' });

      await expect(AuthService.register(registerInput)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should use provided role when specified', async () => {
      const inputWithRole: RegisterInput = {
        ...registerInput,
        role: TenantUserRole.EDITOR,
      };

      const mockTenant = { id: 'tenant-123' };
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockImplementation((data: any) => data);
      mockUserRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      await AuthService.register(inputWithRole);

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: TenantUserRole.EDITOR,
        })
      );
    });
  });

  describe('validateCredentials', () => {
    it('should return user when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await AuthService.validateCredentials({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await AuthService.validateCredentials({
        email: 'notexist@example.com',
        password: 'password123',
      });

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await AuthService.validateCredentials({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result).toBeNull();
    });
  });

  describe('createToken', () => {
    it('should create a valid JWT token', () => {
      const mockUser = {
        id: 'user-123',
        tenantId: 'tenant-123',
        role: TenantUserRole.ADMIN,
      };

      const token = AuthService.createToken(mockUser as any);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Verify token contents
      const decoded = jwt.verify(token, 'test-secret') as any;
      expect(decoded.sub).toBe('user-123');
      expect(decoded.tenantId).toBe('tenant-123');
      expect(decoded.role).toBe(TenantUserRole.ADMIN);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        tenantId: 'tenant-123',
        role: TenantUserRole.ADMIN,
        lastLoginAt: null,
      };
      const mockTenant = { id: 'tenant-123', name: 'Test Tenant' };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenant');
      expect(result).toHaveProperty('settings');
      expect(result.user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should throw error with invalid credentials', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signup', () => {
    const signupInput: SignupInput = {
      tenantName: 'New Business',
      tenantCategory: TenantCategory.RENTACAR,
      adminName: 'Admin User',
      adminEmail: 'admin@newbusiness.com',
      adminPassword: 'securePassword123',
    };

    it('should create new tenant and admin user', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockTenantRepo.findOne.mockResolvedValue(null); // slug check
      mockTenantRepo.create.mockImplementation((data: any) => data);
      mockTenantRepo.save.mockImplementation((data: any) => Promise.resolve({ id: 'new-tenant', ...data }));
      mockUserRepo.create.mockImplementation((data: any) => data);
      mockUserRepo.save.mockImplementation((data: any) => Promise.resolve({
        id: 'new-user',
        tenantId: 'new-tenant',
        role: TenantUserRole.ADMIN,
        ...data,
      }));

      const result = await AuthService.signup(signupInput);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenant');
      expect(mockTenantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Business',
          category: TenantCategory.RENTACAR,
        })
      );
    });

    it('should throw error when admin email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'existing-user' });

      await expect(AuthService.signup(signupInput)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should generate unique slug when tenant name already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockTenantRepo.findOne
        .mockResolvedValueOnce({ slug: 'new-business' }) // First check: slug exists
        .mockResolvedValueOnce(null); // Second check: new-business-1 is available
      mockTenantRepo.create.mockImplementation((data: any) => data);
      mockTenantRepo.save.mockImplementation((data: any) => Promise.resolve({ id: 'new-tenant', ...data }));
      mockUserRepo.create.mockImplementation((data: any) => data);
      mockUserRepo.save.mockImplementation((data: any) => Promise.resolve({
        id: 'new-user',
        tenantId: 'new-tenant',
        role: TenantUserRole.ADMIN,
        ...data,
      }));

      const result = await AuthService.signup(signupInput);

      expect(result.tenant.slug).toBe('new-business-1');
    });
  });

  describe('getProfile', () => {
    it('should return user profile with tenant and settings', async () => {
      const mockUser = {
        id: 'user-123',
        tenantId: 'tenant-123',
        name: 'Test User',
        email: 'test@example.com',
      };
      const mockTenant = { id: 'tenant-123', name: 'Test Tenant' };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      const result = await AuthService.getProfile('user-123');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenant');
      expect(result).toHaveProperty('settings');
      expect(result.user).toEqual(mockUser);
      expect(result.tenant).toEqual(mockTenant);
    });

    it('should throw error when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(AuthService.getProfile('nonexistent-id')).rejects.toThrow('User not found');
    });
  });
});


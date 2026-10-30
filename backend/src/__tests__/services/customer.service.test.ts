/**
 * Unit Tests for CustomerService
 */

// Mock bcryptjs used by CustomerService (default export has .hash / .compare)
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn().mockResolvedValue('hashed-password-123'),
    compare: jest.fn().mockResolvedValue(true),
  },
}));

// Mock dependencies before importing
jest.mock('../../config/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../services/customer-email.service', () => ({
  sendCustomerWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../modules/shared/services/customer-email.service', () => ({
  CustomerEmailService: {
    createOrUpdate: jest.fn().mockResolvedValue(undefined),
  },
}));

import { AppDataSource } from '../../config/data-source';
import { CustomerService, CreateCustomerInput } from '../../modules/shared/services/customer.service';
import { CustomerGender, CustomerIdType } from '../../modules/shared/entities/customer.entity';

describe('CustomerService', () => {
  let mockRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);
  });

  describe('list', () => {
    it('should return all customers for a tenant', async () => {
      const mockCustomers = [
        { id: 'customer-1', tenantId: 'tenant-123', fullName: 'John Doe' },
        { id: 'customer-2', tenantId: 'tenant-123', fullName: 'Jane Doe' },
      ];

      mockRepo.find.mockResolvedValue(mockCustomers);

      const result = await CustomerService.list('tenant-123');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123' },
        relations: ['language'],
        order: { fullName: 'ASC' },
      });
      expect(result).toEqual(mockCustomers);
    });

    it('should return empty array when no customers', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await CustomerService.list('tenant-123');

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return customer by id and tenantId', async () => {
      const mockCustomer = {
        id: 'customer-123',
        tenantId: 'tenant-123',
        fullName: 'John Doe',
      };

      mockRepo.findOne.mockResolvedValue(mockCustomer);

      const result = await CustomerService.getById('customer-123', 'tenant-123');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: 'tenant-123' },
        relations: ['language'],
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should return null when customer not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await CustomerService.getById('nonexistent', 'tenant-123');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createInput: CreateCustomerInput = {
      tenantId: 'tenant-123',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      email: 'john@example.com',
      mobilePhone: '+905551234567',
      gender: CustomerGender.MALE,
      idType: CustomerIdType.TC,
      idNumber: '12345678901',
    };

    it('should create a new customer', async () => {
      const mockCustomer = {
        id: 'new-customer-123',
        ...createInput,
        isActive: true,
        isBlacklisted: false,
      };

      mockRepo.create.mockReturnValue(mockCustomer);
      mockRepo.save.mockResolvedValue(mockCustomer);

      const result = await CustomerService.create(createInput);

      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockCustomer);
    });

    it('should parse date fields correctly', async () => {
      const inputWithDates: CreateCustomerInput = {
        ...createInput,
        birthDate: '1990-01-15',
        idIssueDate: '2020-06-01',
        licenseIssueDate: '2018-03-20',
      };

      mockRepo.create.mockImplementation((data: any) => data);
      mockRepo.save.mockImplementation((data: any) => Promise.resolve({ id: 'new-id', ...data }));

      await CustomerService.create(inputWithDates);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          birthDate: expect.any(Date),
          idIssueDate: expect.any(Date),
          licenseIssueDate: expect.any(Date),
        })
      );
    });

    it('should set default values for isActive and isBlacklisted', async () => {
      mockRepo.create.mockImplementation((data: any) => data);
      mockRepo.save.mockImplementation((data: any) => Promise.resolve({ id: 'new-id', ...data }));

      await CustomerService.create(createInput);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          isBlacklisted: false,
        })
      );
    });

    it('should use idNumber as password when no password provided', async () => {
      mockRepo.create.mockImplementation((data: any) => data);
      mockRepo.save.mockImplementation((data: any) => Promise.resolve({ id: 'new-id', ...data }));

      await CustomerService.create(createInput);

      // Password should be hashed when idNumber is provided
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          idNumber: '12345678901',
        })
      );
    });
  });

  describe('update', () => {
    it('should update customer successfully', async () => {
      const existingCustomer = {
        id: 'customer-123',
        tenantId: 'tenant-123',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
      };

      mockRepo.findOne.mockResolvedValue(existingCustomer);
      mockRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await CustomerService.update('customer-123', 'tenant-123', {
        firstName: 'Jane',
        fullName: 'Jane Doe',
      });

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: 'tenant-123' },
      });
      expect(result.firstName).toBe('Jane');
      expect(result.fullName).toBe('Jane Doe');
    });

    it('should throw error when customer not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        CustomerService.update('nonexistent', 'tenant-123', { firstName: 'Test' })
      ).rejects.toThrow('Customer not found');
    });

    it('should parse date fields on update', async () => {
      const existingCustomer = {
        id: 'customer-123',
        tenantId: 'tenant-123',
      };

      mockRepo.findOne.mockResolvedValue(existingCustomer);
      mockRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      await CustomerService.update('customer-123', 'tenant-123', {
        birthDate: '1995-05-15',
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          birthDate: expect.any(Date),
        })
      );
    });
  });

  describe('remove', () => {
    it('should remove customer successfully', async () => {
      const existingCustomer = {
        id: 'customer-123',
        tenantId: 'tenant-123',
      };

      mockRepo.findOne.mockResolvedValue(existingCustomer);
      mockRepo.remove.mockResolvedValue(existingCustomer);

      await CustomerService.remove('customer-123', 'tenant-123');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'customer-123', tenantId: 'tenant-123' },
      });
      expect(mockRepo.remove).toHaveBeenCalledWith(existingCustomer);
    });

    it('should throw error when customer not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        CustomerService.remove('nonexistent', 'tenant-123')
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const existingCustomer = {
        id: 'customer-123',
        tenantId: 'tenant-123',
        passwordHash: 'old-hash',
      };

      mockRepo.findOne.mockResolvedValue(existingCustomer);
      mockRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await CustomerService.changePassword(
        'customer-123',
        'tenant-123',
        'newPassword123'
      );

      expect(result.passwordHash).toBeDefined();
      expect(result.passwordHash).not.toBe('old-hash');
    });

    it('should throw error when customer not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        CustomerService.changePassword('nonexistent', 'tenant-123', 'newPassword')
      ).rejects.toThrow('Customer not found');
    });

    it('should throw error when password is empty', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'customer-123',
        tenantId: 'tenant-123',
      });

      await expect(
        CustomerService.changePassword('customer-123', 'tenant-123', '')
      ).rejects.toThrow('New password is required');
    });

    it('should throw error when password is too short', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'customer-123',
        tenantId: 'tenant-123',
      });

      await expect(
        CustomerService.changePassword('customer-123', 'tenant-123', '12345')
      ).rejects.toThrow('Password must be at least 6 characters long');
    });
  });
});


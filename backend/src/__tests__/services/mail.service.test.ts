/**
 * Unit Tests for MailService
 */

// Mock nodemailer before importing
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  })),
}));

// Mock TenantSettingsService
jest.mock('../../modules/shared/services/tenant-settings.service', () => ({
  TenantSettingsService: {
    getMailSettings: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import nodemailer from 'nodemailer';
import { TenantSettingsService } from '../../modules/shared/services/tenant-settings.service';
import { sendMail, sendBulkMail, createTransporterForTenant, SendMailInput } from '../../services/mail.service';
import { logger } from '../../utils/logger';

describe('MailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransporterForTenant', () => {
    it('should create transporter with valid settings', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
        fromName: 'Test App',
      };

      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);

      const transporter = await createTransporterForTenant('tenant-123');

      expect(transporter).not.toBeNull();
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
          auth: {
            user: 'user@example.com',
            pass: 'password123',
          },
        })
      );
    });

    it('should return null when mail settings not configured', async () => {
      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(null);

      const transporter = await createTransporterForTenant('tenant-123');

      expect(transporter).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Mail settings not configured')
      );
    });

    it('should return null when SMTP host missing', async () => {
      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue({
        fromEmail: 'test@example.com',
      });

      const transporter = await createTransporterForTenant('tenant-123');

      expect(transporter).toBeNull();
    });

    it('should use secure connection for port 465', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 465,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
      };

      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);

      await createTransporterForTenant('tenant-123');

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        })
      );
    });

    it('should return null when SMTP verification fails', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
      };

      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockRejectedValue(new Error('SMTP auth failed')),
      });

      const transporter = await createTransporterForTenant('tenant-123');

      expect(transporter).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('sendMail', () => {
    const validInput: SendMailInput = {
      tenantId: 'tenant-123',
      to: 'recipient@example.com',
      subject: 'Test Email',
      html: '<p>Hello World</p>',
    };

    it('should send email successfully', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
        fromName: 'Test App',
      };

      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      });

      const result = await sendMail(validInput);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
    });

    it('should return error when tenantId is missing', async () => {
      const result = await sendMail({
        ...validInput,
        tenantId: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('tenantId is required');
    });

    it('should return error when recipient is missing', async () => {
      const result = await sendMail({
        ...validInput,
        to: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('to (recipient email) is required');
    });

    it('should return error when subject is missing', async () => {
      const result = await sendMail({
        ...validInput,
        subject: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('subject is required');
    });

    it('should return error when both html and text are missing', async () => {
      const result = await sendMail({
        tenantId: 'tenant-123',
        to: 'recipient@example.com',
        subject: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Either html or text content is required');
    });

    it('should accept text content instead of html', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
      };

      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
      });

      const result = await sendMail({
        tenantId: 'tenant-123',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Plain text email',
      });

      expect(result.success).toBe(true);
    });

    it('should return error when mail settings not configured', async () => {
      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(null);

      const result = await sendMail(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Mail settings not configured');
    });

    it('should send to multiple recipients', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
      };

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: mockSendMail,
      });

      await sendMail({
        ...validInput,
        to: ['recipient1@example.com', 'recipient2@example.com'],
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['recipient1@example.com', 'recipient2@example.com'],
        })
      );
    });

    it('should include CC and BCC when provided', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
      };

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: mockSendMail,
      });

      await sendMail({
        ...validInput,
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc@example.com',
          bcc: 'bcc@example.com',
        })
      );
    });

    it('should handle send mail errors', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
      };

      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP error')),
      });

      const result = await sendMail(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP error');
    });
  });

  describe('sendBulkMail', () => {
    const recipients = [
      { to: 'user1@example.com', subject: 'Hello 1', html: '<p>Content 1</p>' },
      { to: 'user2@example.com', subject: 'Hello 2', html: '<p>Content 2</p>' },
      { to: 'user3@example.com', subject: 'Hello 3', html: '<p>Content 3</p>' },
    ];

    it('should send emails to all recipients successfully', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
      };

      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
      });

      const result = await sendBulkMail('tenant-123', recipients);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should track failed emails', async () => {
      const mockSettings = {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'password123',
        fromEmail: 'noreply@example.com',
      };

      const mockSendMail = jest
        .fn()
        .mockResolvedValueOnce({ messageId: 'id-1' })
        .mockRejectedValueOnce(new Error('Failed for user2'))
        .mockResolvedValueOnce({ messageId: 'id-3' });

      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(mockSettings);
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: mockSendMail,
      });

      const result = await sendBulkMail('tenant-123', recipients);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].to).toBe('user2@example.com');
      expect(result.errors[0].error).toBe('Failed for user2');
    });

    it('should handle all emails failing', async () => {
      (TenantSettingsService.getMailSettings as jest.Mock).mockResolvedValue(null);

      const result = await sendBulkMail('tenant-123', recipients);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.errors).toHaveLength(3);
    });
  });
});


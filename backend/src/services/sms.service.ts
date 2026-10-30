import { logger } from '../utils/logger';

export type SendSMSInput = {
  tenantId: string;
  to: string; // Phone number (e.g., +905551234567)
  message: string;
};

export type SendSMSResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * SMS Service
 * Supports multiple SMS providers (Twilio, AWS SNS, etc.)
 */
export class SMSService {
  /**
   * Send SMS message
   * Currently supports Twilio - can be extended for other providers
   */
  static async sendSMS(input: SendSMSInput): Promise<SendSMSResult> {
    try {
      // Validate input
      if (!input.tenantId) {
        return {
          success: false,
          error: 'tenantId is required',
        };
      }

      if (!input.to) {
        return {
          success: false,
          error: 'to (recipient phone) is required',
        };
      }

      if (!input.message) {
        return {
          success: false,
          error: 'message is required',
        };
      }

      // Get SMS provider from environment or tenant settings
      const smsProvider = process.env.SMS_PROVIDER || 'twilio';

      if (smsProvider === 'twilio') {
        return await this.sendViaTwilio(input);
      } else if (smsProvider === 'aws-sns') {
        return await this.sendViaAWSSNS(input);
      } else {
        // Fallback: Log SMS (for development/testing)
        logger.info(`[SMS] Would send SMS to ${input.to}: ${input.message}`, {
          tenantId: input.tenantId,
        });
        return {
          success: true,
          messageId: `mock-${Date.now()}`,
        };
      }
    } catch (error: any) {
      logger.error(`Failed to send SMS to ${input.to}`, error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private static async sendViaTwilio(input: SendSMSInput): Promise<SendSMSResult> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        logger.warn('[SMS] Twilio credentials not configured. SMS will not be sent.');
        return {
          success: false,
          error: 'Twilio credentials not configured',
        };
      }

      // Dynamic import to avoid requiring twilio in package.json if not used
      // @ts-ignore - twilio is optional dependency
      const twilio = await import('twilio');
      const client = twilio.default(accountSid, authToken);

      const message = await client.messages.create({
        body: input.message,
        from: fromNumber,
        to: input.to,
      });

      logger.info(`[SMS] SMS sent via Twilio to ${input.to}`, {
        messageSid: message.sid,
        tenantId: input.tenantId,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      logger.error('[SMS] Twilio error', error);
      return {
        success: false,
        error: error.message || 'Twilio SMS failed',
      };
    }
  }

  /**
   * Send SMS via AWS SNS
   */
  private static async sendViaAWSSNS(input: SendSMSInput): Promise<SendSMSResult> {
    try {
      // @ts-ignore - aws-sdk is optional dependency
      const AWS = await import('aws-sdk');
      const sns = new AWS.SNS({
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      });

      const params = {
        Message: input.message,
        PhoneNumber: input.to,
      };

      const result = await sns.publish(params).promise();

      logger.info(`[SMS] SMS sent via AWS SNS to ${input.to}`, {
        messageId: result.MessageId,
        tenantId: input.tenantId,
      });

      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error: any) {
      logger.error('[SMS] AWS SNS error', error);
      return {
        success: false,
        error: error.message || 'AWS SNS SMS failed',
      };
    }
  }
}


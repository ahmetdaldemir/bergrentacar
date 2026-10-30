import { logger } from '../utils/logger';

export type SendWhatsAppInput = {
  tenantId: string;
  to: string; // Phone number (e.g., +905551234567)
  message: string;
};

export type SendWhatsAppResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * WhatsApp Service
 * Supports multiple WhatsApp providers (Twilio, WhatsApp Business API, etc.)
 */
export class WhatsAppService {
  /**
   * Send WhatsApp message
   * Currently supports Twilio WhatsApp - can be extended for other providers
   */
  static async sendWhatsApp(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
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

      // Get WhatsApp provider from environment
      const whatsappProvider = process.env.WHATSAPP_PROVIDER || 'twilio';

      if (whatsappProvider === 'twilio') {
        return await this.sendViaTwilio(input);
      } else if (whatsappProvider === 'whatsapp-business-api') {
        return await this.sendViaWhatsAppBusinessAPI(input);
      } else {
        // Fallback: Log WhatsApp (for development/testing)
        logger.info(`[WhatsApp] Would send WhatsApp to ${input.to}: ${input.message}`, {
          tenantId: input.tenantId,
        });
        return {
          success: true,
          messageId: `mock-${Date.now()}`,
        };
      }
    } catch (error: any) {
      logger.error(`Failed to send WhatsApp to ${input.to}`, error);
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp',
      };
    }
  }

  /**
   * Send WhatsApp via Twilio
   */
  private static async sendViaTwilio(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

      if (!accountSid || !authToken || !whatsappFrom) {
        logger.warn('[WhatsApp] Twilio credentials not configured. WhatsApp will not be sent.');
        return {
          success: false,
          error: 'Twilio credentials not configured',
        };
      }

      // Dynamic import to avoid requiring twilio in package.json if not used
      // @ts-ignore - twilio is optional dependency
      const twilio = await import('twilio');
      const client = twilio.default(accountSid, authToken);

      // Format phone number for WhatsApp (must include whatsapp: prefix)
      const toNumber = input.to.startsWith('whatsapp:') ? input.to : `whatsapp:${input.to}`;

      const message = await client.messages.create({
        body: input.message,
        from: whatsappFrom,
        to: toNumber,
      });

      logger.info(`[WhatsApp] WhatsApp sent via Twilio to ${input.to}`, {
        messageSid: message.sid,
        tenantId: input.tenantId,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      logger.error('[WhatsApp] Twilio error', error);
      return {
        success: false,
        error: error.message || 'Twilio WhatsApp failed',
      };
    }
  }

  /**
   * Send WhatsApp via WhatsApp Business API (Meta)
   */
  private static async sendViaWhatsAppBusinessAPI(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    try {
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';

      if (!accessToken || !phoneNumberId) {
        logger.warn('[WhatsApp] WhatsApp Business API credentials not configured.');
        return {
          success: false,
          error: 'WhatsApp Business API credentials not configured',
        };
      }

      const axios = await import('axios');
      const response = await axios.default.post(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: input.to.replace(/^\+/, ''), // Remove + prefix
          type: 'text',
          text: {
            body: input.message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`[WhatsApp] WhatsApp sent via Business API to ${input.to}`, {
        messageId: response.data.messages?.[0]?.id,
        tenantId: input.tenantId,
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
      };
    } catch (error: any) {
      logger.error('[WhatsApp] Business API error', error);
      return {
        success: false,
        error: error.message || 'WhatsApp Business API failed',
      };
    }
  }
}


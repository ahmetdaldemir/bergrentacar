/**
 * General Mail Service
 * Handles sending emails using tenant-specific SMTP settings from tenant_settings table
 */

import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { TenantSettingsService } from '../modules/shared/services/tenant-settings.service';
import { logger } from '../utils/logger';

export interface SendMailInput {
  tenantId: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
}

/**
 * Create SMTP transporter from tenant mail settings
 */
export async function createTransporterForTenant(tenantId: string): Promise<Transporter | null> {
  try {
    // Get mail settings from tenant_settings table
    const mailSettings = await TenantSettingsService.getMailSettings(tenantId);
    
    if (!mailSettings || !mailSettings.smtpHost || !mailSettings.fromEmail) {
      logger.warn(`Mail settings not configured for tenant ${tenantId}`);
      return null;
    }

    // Determine port and secure settings
    const smtpPort = mailSettings.smtpPort || 587;
    const useSecure = mailSettings.smtpSecure !== undefined 
      ? mailSettings.smtpSecure 
      : smtpPort === 465;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: mailSettings.smtpHost,
      port: smtpPort,
      secure: useSecure,
      requireTLS: !useSecure && smtpPort === 587, // STARTTLS for port 587
      auth: {
        user: mailSettings.smtpUser,
        pass: mailSettings.smtpPassword,
      },
      tls: {
        // Skip SSL certificate verification (for development/testing)
        rejectUnauthorized: false,
      },
    });

    // Verify transporter connection
    try {
      await transporter.verify();
      logger.info(`SMTP connection verified for tenant ${tenantId}`);
    } catch (error) {
      logger.error(`SMTP connection verification failed for tenant ${tenantId}:`, error);
      return null;
    }

    return transporter;
  } catch (error) {
    logger.error(`Error creating transporter for tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Send email using tenant-specific SMTP settings
 */
export async function sendMail(input: SendMailInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
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
        error: 'to (recipient email) is required',
      };
    }

    if (!input.subject) {
      return {
        success: false,
        error: 'subject is required',
      };
    }

    if (!input.html && !input.text) {
      return {
        success: false,
        error: 'Either html or text content is required',
      };
    }

    // Get mail settings for tenant
    const mailSettings = await TenantSettingsService.getMailSettings(input.tenantId);
    
    if (!mailSettings || !mailSettings.smtpHost || !mailSettings.fromEmail) {
      return {
        success: false,
        error: `Mail settings not configured for tenant ${input.tenantId}. Please configure SMTP settings in tenant settings.`,
      };
    }

    // Create transporter
    const transporter = await createTransporterForTenant(input.tenantId);
    if (!transporter) {
      return {
        success: false,
        error: `Failed to create SMTP transporter for tenant ${input.tenantId}`,
      };
    }

    // Prepare email options
    const mailOptions: SendMailOptions = {
      from: `"${mailSettings.fromName || 'System'}" <${mailSettings.fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo || mailSettings.fromEmail,
      attachments: input.attachments,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent successfully for tenant ${input.tenantId}`, {
      messageId: info.messageId,
      to: input.to,
      subject: input.subject,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error(`Error sending email for tenant ${input.tenantId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Send bulk emails to multiple recipients
 */
export async function sendBulkMail(
  tenantId: string,
  recipients: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }>
): Promise<{ success: number; failed: number; errors: Array<{ to: string; error: string }> }> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ to: string; error: string }> = [];

  for (const recipient of recipients) {
    const result = await sendMail({
      tenantId,
      ...recipient,
    });

    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push({
        to: recipient.to,
        error: result.error || 'Unknown error',
      });
    }
  }

  return { success, failed, errors };
}


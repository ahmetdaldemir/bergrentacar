/**
 * Mail Controller
 * Handles email sending API endpoints
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { sendMail, sendBulkMail, SendMailInput } from '../../../services/mail.service';
import { asyncHandler, sendSuccess, ValidationError, AppError, ErrorCode } from '../../../utils/errors';

export class MailController {
  static send = asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string | undefined = (req as AuthenticatedRequest).auth?.tenantId ?? req.body.tenantId;
    if (!tenantId) throw new ValidationError('tenantId is required. Authenticate with a tenant user or provide in body (e.g. internal script).');
    const { to, subject, html, text } = req.body;
    if (!to) throw new ValidationError('to (recipient email) is required');
    if (!subject) throw new ValidationError('subject is required');
    if (!html && !text) throw new ValidationError('Either html or text content is required');
    const mailInput: SendMailInput = { tenantId, to, subject, html, text, cc: req.body.cc, bcc: req.body.bcc, replyTo: req.body.replyTo, attachments: req.body.attachments };
    const result = await sendMail(mailInput);
    if (!result.success) throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, result.error || 'Failed to send email', 500);
    sendSuccess(res, { message: 'Email sent successfully', messageId: result.messageId, to, subject, sentAt: new Date().toISOString() });
  });

  static sendBulk = asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string | undefined = (req as AuthenticatedRequest).auth?.tenantId ?? req.body.tenantId;
    if (!tenantId) throw new ValidationError('tenantId is required. Authenticate with a tenant user or provide in body (e.g. internal script).');
    const { recipients } = req.body;
    if (!Array.isArray(recipients) || recipients.length === 0) throw new ValidationError('recipients array is required and must not be empty');
    for (const recipient of recipients) {
      if (!recipient.to || !recipient.subject) throw new ValidationError('Each recipient must have "to" and "subject" fields');
      if (!recipient.html && !recipient.text) throw new ValidationError('Each recipient must have either "html" or "text" content');
    }
    const result = await sendBulkMail(tenantId, recipients);
    sendSuccess(res, { message: `Bulk email sending completed. ${result.success} sent, ${result.failed} failed.`, success: result.success, failed: result.failed, errors: result.errors });
  });
}


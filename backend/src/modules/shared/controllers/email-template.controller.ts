import { Request, Response } from 'express';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailTemplateType } from '../entities/email-template.entity';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError, NotFoundError } from '../../../utils/errors';

export class EmailTemplateController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    const languageId = req.query.languageId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');
    const templates = await EmailTemplateService.list(tenantId, languageId);
    sendSuccess(res, templates);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const template = await EmailTemplateService.getById(id);
    if (!template) throw new NotFoundError('Email template', id);
    sendSuccess(res, template);
  });

  static getByType = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    const type = req.query.type as EmailTemplateType;
    const languageId = req.query.languageId as string | undefined;
    if (!tenantId || !type) throw new ValidationError('tenantId and type query params are required');
    if (!Object.values(EmailTemplateType).includes(type)) throw new ValidationError('Invalid template type');
    const template = await EmailTemplateService.getByType(tenantId, type, languageId);
    sendSuccess(res, template);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const { languageId, type, name, subject, body, isActive, description } = req.body;
    if (!tenantId || !type || !name || !subject || !body) {
      throw new ValidationError('Authentication required, type, name, subject, and body are required');
    }
    if (!Object.values(EmailTemplateType).includes(type)) throw new ValidationError('Invalid template type');
    const template = await EmailTemplateService.create({
      tenantId,
      languageId,
      type,
      name,
      subject,
      body,
      isActive,
      description,
    });
    sendSuccess(res, template, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body as any;
    if (updateData?.type && !Object.values(EmailTemplateType).includes(updateData.type)) {
      throw new ValidationError('Invalid template type');
    }
    const template = await EmailTemplateService.update(id, updateData);
    sendSuccess(res, template);
  });

  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await EmailTemplateService.delete(id);
    res.status(204).send();
  });
}

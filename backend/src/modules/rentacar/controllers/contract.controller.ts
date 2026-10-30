import { Response } from 'express';
import { ContractService } from '../services/contract.service';
import { ContractTemplateService } from '../services/contract-template.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError } from '../../../utils/errors';

export class ContractController {
  static getDefaultTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const template = await ContractTemplateService.getDefaultTemplate(tenantId);
    sendSuccess(res, template);
  });

  static listTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const templates = await ContractTemplateService.list(tenantId);
    sendSuccess(res, templates);
  });

  static getTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const template = await ContractTemplateService.getById(id, tenantId);
    if (!template) throw new NotFoundError('Template', id);
    sendSuccess(res, template);
  });

  static createTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const template = await ContractTemplateService.create({ ...req.body, tenantId });
    sendSuccess(res, template, 201);
  });

  static updateTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const template = await ContractTemplateService.update(id, tenantId, req.body);
    sendSuccess(res, template);
  });

  static printTemplatePreview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const { getEmptyContractPrintHtml } = await import('../services/reservation-contract-print.service');
    const html = await getEmptyContractPrintHtml(tenantId, id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  static deleteTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    await ContractTemplateService.delete(id, tenantId);
    sendSuccess(res, { message: 'Template deleted' });
  });

  static previewContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { templateId, variables, optionalBlocks } = req.body;
    const template = await ContractTemplateService.getById(templateId, tenantId);
    if (!template) throw new NotFoundError('Template', templateId);
    const { ContractBuilderService } = await import('../services/contract-builder.service');
    const rendered = ContractBuilderService.renderContract({
      template,
      variables: variables || {},
      optionalBlocks: optionalBlocks || [],
    });
    sendSuccess(res, rendered);
  });

  static createContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const contract = await ContractService.create({
      ...req.body,
      tenantId,
      createdByUserId: tenantId,
    });
    sendSuccess(res, contract, 201);
  });

  static getContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const contract = await ContractService.getById(id, tenantId);
    if (!contract) throw new NotFoundError('Contract', id);
    sendSuccess(res, contract);
  });

  static listContracts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const status = req.query.status as string | undefined;
    const contracts = await ContractService.list(tenantId, status as any);
    sendSuccess(res, contracts);
  });

  static updateContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const contract = await ContractService.update(id, tenantId, req.body);
    sendSuccess(res, contract);
  });

  static signContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const contract = await ContractService.signContract(id, tenantId, req.body);
    sendSuccess(res, { message: 'Contract signed and PDF generated', ...contract });
  });

  static generatePDF = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const contract = await ContractService.getById(id, tenantId);
    if (!contract) throw new NotFoundError('Contract', id);
    const pdfUrl = await ContractService.generateContractPDF(contract);
    sendSuccess(res, { message: 'PDF generated', pdfUrl });
  });

  static generateThermalPDF = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const contract = await ContractService.getById(id, tenantId);
    if (!contract) throw new NotFoundError('Contract', id);
    const pdfBuffer = await ContractService.generateThermalPDF(contract);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${contract.contractNumber}-thermal.pdf"`);
    res.send(pdfBuffer);
  });

  static deleteContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    await ContractService.delete(id, tenantId);
    sendSuccess(res, { message: 'Contract deleted' });
  });
}


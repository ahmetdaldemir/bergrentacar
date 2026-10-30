import { Request, Response } from 'express';
import { CrmPageCategoryService } from '../services/crm-page-category.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { asyncHandler, ValidationError, NotFoundError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';

export class CrmPageCategoryController {
  /**
   * GET /api/crm/page-categories
   * List all categories for a tenant (public endpoint for API)
   */
  static list = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    const languageId = req.query.languageId as string | undefined;

    if (!tenantId) {
      throw new ValidationError('tenantId is required');
    }

    const categories = await CrmPageCategoryService.list(tenantId, languageId);
    logger.info(`Listed CRM page categories for tenant ${tenantId}`, { tenantId, languageId, count: categories.length });
    res.json({ success: true, data: categories });
  });

  /**
   * GET /api/crm/page-categories/:id
   * Get category by ID
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const languageId = req.query.languageId as string | undefined;

    const category = await CrmPageCategoryService.getById(id, languageId);

    if (!category) {
      throw new NotFoundError('CRM Page Category', id);
    }

    logger.info(`Retrieved CRM page category ${id}`);
    res.json({ success: true, data: category });
  });

  /**
   * POST /api/crm/page-categories
   * Create new category (authenticated)
   */
  static create = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const tenantId = req.tenant!.id;

    const category = await CrmPageCategoryService.create({
      ...req.body,
      tenantId, // Always use authenticated user's tenantId
    });

    logger.info(`Created CRM page category ${category.id}`, { categoryId: category.id, tenantId });
    res.status(201).json({ success: true, data: category });
  });

  /**
   * PUT /api/crm/page-categories/:id
   * Update category (authenticated)
   */
  static update = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const { id } = req.params;

    const category = await CrmPageCategoryService.update(id, req.body);
    logger.info(`Updated CRM page category ${id}`);
    res.json({ success: true, data: category });
  });

  /**
   * DELETE /api/crm/page-categories/:id
   * Delete category (authenticated)
   */
  static remove = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const { id } = req.params;

    await CrmPageCategoryService.delete(id);
    logger.info(`Deleted CRM page category ${id}`);
    res.status(204).send();
  });
}


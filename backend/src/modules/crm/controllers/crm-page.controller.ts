import { Request, Response } from 'express';
import { CrmPageService } from '../services/crm-page.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { asyncHandler, ValidationError, NotFoundError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';

export class CrmPageController {
  /**
   * GET /api/crm/pages
   * List all pages for a tenant, optionally filtered by category (public endpoint for API)
   */
  static list = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    const languageId = req.query.languageId as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;

    if (!tenantId) {
      throw new ValidationError('tenantId is required');
    }

    const pages = await CrmPageService.list(tenantId, languageId, categoryId);
    logger.info(`Listed CRM pages for tenant ${tenantId}`, { tenantId, languageId, categoryId, count: pages.length });
    res.json({ success: true, data: pages });
  });

  /**
   * GET /api/crm/pages/grouped
   * Kategorilere göre gruplanmış sayfalar - web siteleri için menü/footer
   * Response: [{ category: { id, name, slug }, pages: [{ id, title, slug, url, ... }] }]
   */
  static listGroupedByCategory = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    const languageId = req.query.languageId as string | undefined;

    if (!tenantId) {
      throw new ValidationError('tenantId is required');
    }

    const grouped = await CrmPageService.listGroupedByCategory(tenantId, languageId);
    logger.info(`Listed CRM pages grouped for tenant ${tenantId}`, { tenantId, languageId, categoryCount: grouped.length });
    res.json({ success: true, data: grouped });
  });

  /**
   * GET /api/crm/pages/:id
   * Get page by ID
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const languageId = req.query.languageId as string | undefined;

    const page = await CrmPageService.getById(id, languageId);

    if (!page) {
      throw new NotFoundError('CRM Page', id);
    }

    // Increment view count
    await CrmPageService.incrementViewCount(id);

    logger.info(`Retrieved CRM page ${id}`);
    res.json({ success: true, data: page });
  });

  /**
   * GET /api/crm/pages/slug/:slug
   * Get page by slug (public endpoint for frontend)
   */
  static getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const tenantId = req.query.tenantId as string | undefined;
    const languageId = req.query.languageId as string | undefined;

    if (!tenantId) {
      throw new ValidationError('tenantId is required');
    }

    const page = await CrmPageService.getBySlug(tenantId, slug, languageId);

    if (!page) {
      throw new NotFoundError('CRM Page', slug);
    }

    // Increment view count
    await CrmPageService.incrementViewCount(page.id);

    logger.info(`Retrieved CRM page by slug ${slug}`);
    res.json({ success: true, data: page });
  });

  /**
   * POST /api/crm/pages
   * Create new page (authenticated)
   * Can create category on-the-fly if categorySlug provided
   */
  static create = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const tenantId = req.tenant!.id;

    const page = await CrmPageService.create({
      ...req.body,
      tenantId, // Always use authenticated user's tenantId
    });

    logger.info(`Created CRM page ${page.id}`, { pageId: page.id, tenantId, categoryId: page.categoryId });
    res.status(201).json({ success: true, data: page });
  });

  /**
   * PUT /api/crm/pages/:id
   * Update page (authenticated)
   */
  static update = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const { id } = req.params;

    const page = await CrmPageService.update(id, req.body);
    logger.info(`Updated CRM page ${id}`);
    res.json({ success: true, data: page });
  });

  /**
   * DELETE /api/crm/pages/:id
   * Delete page (authenticated)
   */
  static remove = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const { id } = req.params;

    await CrmPageService.delete(id);
    logger.info(`Deleted CRM page ${id}`);
    res.status(204).send();
  });
}


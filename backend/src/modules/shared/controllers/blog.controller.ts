import { Request, Response } from 'express';
import { BlogService } from '../services/blog.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { asyncHandler, ValidationError, NotFoundError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';
import { BlogAiService } from '../services/blog-ai.service';
import { BlogStatus } from '../entities/blog.entity';
import { LanguageService } from '../services/language.service';

export class BlogController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    // Get tenantId from query parameter (no authentication required)
    const tenantId = req.query.tenantId as string | undefined;
    const locationId = req.query.locationId as string | undefined;
    
    // Get languageId from query parameter
    const languageId: string | undefined = req.query.languageId as string | undefined;

    if (!tenantId) {
      throw new ValidationError('tenantId is required');
    }

    const blogs = await BlogService.list(tenantId, languageId, locationId);
    logger.info(`Listed blogs for tenant ${tenantId}`, { tenantId, languageId, locationId, count: blogs.length });
    res.json({ success: true, data: blogs });
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Get languageId from query parameter
    const languageId: string | undefined = req.query.languageId as string | undefined;
    
    const blog = await BlogService.getById(id, languageId);
    
    if (!blog) {
      throw new NotFoundError('Blog', id);
    }

    logger.info(`Retrieved blog ${id}`);
    res.json({ success: true, data: blog });
  });

  static create = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    // Get tenantId from authenticated user's token (security: prevent tenant spoofing)
    const tenantId = req.auth?.tenantId;
    
    if (!tenantId) {
      throw new ValidationError('Authentication required');
    }

    // Override tenantId from body to prevent security issues
    const blog = await BlogService.create({
      ...req.body,
      tenantId, // Always use authenticated user's tenantId
    });
    logger.info(`Created blog ${blog.id}`, { blogId: blog.id, tenantId: blog.tenantId });
    res.status(201).json({ success: true, data: blog });
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const blog = await BlogService.update(id, req.body);
    logger.info(`Updated blog ${id}`);
    res.json({ success: true, data: blog });
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await BlogService.remove(id);
    logger.info(`Deleted blog ${id}`);
    res.status(204).send();
  });

  /**
   * POST /api/blogs/generate-content
   * Generate AI content for blog (Turkish + auto-translations)
   * Returns JSON with content in all languages (no DB write)
   * 
   * Body: { title: string, tone?: 'kurumsal' | 'samimi' | 'satis', regenerate?: boolean }
   */
  static generateContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { title, tone, regenerate, languageCode } = req.body;
    const tenantId = req.auth?.tenantId;

    if (!title || !title.trim()) {
      throw new ValidationError('title is required');
    }

    if (!tenantId) {
      throw new ValidationError('Authentication required');
    }

    const result = await BlogAiService.generateBlogContent({
      title: title.trim(),
      tone: tone || 'kurumsal',
      regenerate: regenerate === true,
      tenantId, // Required for tenant-specific AI settings
      sourceLanguageCode: languageCode,
    } as any);

    logger.info('Generated blog content', { title, tone, regenerate, tenantId });
    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/blogs/:id/regenerate-content
   * Regenerate AI content for existing blog
   * Overwrites existing content with new AI-generated content
   */
  static regenerateContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { tone } = req.body;
    const tenantId = req.auth?.tenantId;

    if (!tenantId) {
      throw new ValidationError('Authentication required');
    }

    // Get existing blog
    const blog = await BlogService.getById(id);
    if (!blog) {
      throw new NotFoundError('Blog', id);
    }

    // Security: Ensure blog belongs to authenticated tenant
    if (blog.tenantId !== tenantId) {
      throw new ValidationError('Unauthorized access to blog');
    }

    // Don't regenerate if blog is published
    if (blog.status === BlogStatus.PUBLISHED) {
      throw new ValidationError('Cannot regenerate content for published blog');
    }

    // Get title from default language translation
    if (!blog.translations || blog.translations.length === 0) {
      throw new ValidationError('Blog has no translations');
    }

    // Find default language translation or use first one
    const defaultLanguage = await LanguageService.getDefault();
    const defaultTranslation = blog.translations.find(
      (t) => defaultLanguage && (t.language as any)?.id === defaultLanguage.id
    ) || blog.translations[0];

    if (!defaultTranslation || !defaultTranslation.name) {
      throw new ValidationError('Blog title not found');
    }

    // Generate new content
    const aiContent = await BlogAiService.generateBlogContent({
      title: defaultTranslation.name, // Title is stored in name field
      tone: tone || 'kurumsal',
      regenerate: true, // Force regeneration
      tenantId, // Required for tenant-specific AI settings
    });

    // Get Turkish content (default)
    const turkishContent = aiContent.tr;
    if (!turkishContent) {
      throw new Error('Failed to generate Turkish content');
    }

    // Get all active languages
    const allLanguages = await LanguageService.list();
    const activeLanguages = allLanguages.filter(lang => lang.isActive);
    const turkishLanguage = activeLanguages.find(lang => lang.code === 'tr');

    // Helper function to generate slug from title
    const slugify = (text: string): string => {
      return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    };

    // Prepare translations
    const translations = activeLanguages
      .filter(lang => lang.code !== 'tr')
      .map(lang => {
        const langContent = aiContent[lang.code];
        if (!langContent) return null;

        return {
          languageId: lang.id,
          title: langContent.title,
          slug: slugify(langContent.title), // Generate slug from title
          content: langContent.content,
          short_description: langContent.short_description,
        };
      })
      .filter(t => t !== null) as Array<{ languageId: string; title: string; slug: string; content: string; short_description?: string }>;

    // Add Turkish translation if not default
    if (turkishLanguage) {
      translations.push({
        languageId: turkishLanguage.id,
        title: turkishContent.title,
        slug: slugify(turkishContent.title), // Generate slug from title
        content: turkishContent.content,
        short_description: turkishContent.short_description,
      });
    }

    // Update blog with new content (translations only, no title/content in update)
    const updatedBlog = await BlogService.update(id, {
      translations,
    });

    logger.info('Regenerated blog content', { blogId: id, tone });
    res.json({
      success: true,
      data: updatedBlog,
    });
  });
}


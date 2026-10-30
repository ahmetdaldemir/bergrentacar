import { Response } from 'express';
import { ExtraService } from '../services/extra.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler } from '../../../utils/errors';

export class ExtraController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Get tenantId from authenticated user's token (security)
    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const extras = await ExtraService.list(tenantId);
    res.json(extras);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    // Get tenantId from authenticated user's token (security)
    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const extra = await ExtraService.getById(id, tenantId);
    if (!extra) {
      return res.status(404).json({ message: 'Extra not found' });
    }

    res.json(extra);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Get tenantId from authenticated user's token (security: prevent tenant spoofing)
    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Override tenantId from body to prevent security issues
    const extra = await ExtraService.create({
      ...req.body,
      tenantId, // Always use authenticated user's tenantId
    });
    res.status(201).json(extra);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    // Get tenantId from authenticated user's token (security)
    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const extra = await ExtraService.update(id, tenantId, req.body);
    res.json(extra);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    // Get tenantId from authenticated user's token (security)
    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    await ExtraService.remove(id, tenantId);
    res.status(204).send();
  });
}


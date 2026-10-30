import { Response } from 'express';
import { TransferExtraProductService } from '../services/transfer-extra-product.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler } from '../../../utils/errors';

export class TransferExtraProductController {
  /** ADMIN — tüm ürünleri listele (çevirilerle) */
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ message: 'Authentication required' });

    const products = await TransferExtraProductService.list(tenantId);
    return res.json({ success: true, data: products });
  });

  /** PUBLIC — aktif ürünleri listele (web sitesi için) */
  static listPublic = asyncHandler(async (req: any, res: Response) => {
    // tenantId: subdomain middleware'den veya query param'dan alınır
    const tenantId = (req.tenant?.id as string | undefined) || (req.query.tenantId as string | undefined);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'tenantId is required (query param or subdomain)' });
    }

    const languageId = req.query.languageId as string | undefined;

    const products = await TransferExtraProductService.list(tenantId, {
      onlyActive: true,
      languageId,
    });

    return res.json({ success: true, data: products });
  });

  /** ADMIN — tek ürün */
  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ message: 'Authentication required' });

    const product = await TransferExtraProductService.getById(req.params.id, tenantId);
    if (!product) return res.status(404).json({ message: 'Transfer extra product not found' });

    return res.json({ success: true, data: product });
  });

  /** ADMIN — ürün oluştur */
  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ message: 'Authentication required' });

    const product = await TransferExtraProductService.create({ ...req.body, tenantId });
    return res.status(201).json({ success: true, data: product });
  });

  /** ADMIN — ürün güncelle */
  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ message: 'Authentication required' });

    const product = await TransferExtraProductService.update(req.params.id, tenantId, req.body);
    return res.json({ success: true, data: product });
  });

  /** ADMIN — ürün sil */
  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) return res.status(401).json({ message: 'Authentication required' });

    await TransferExtraProductService.remove(req.params.id, tenantId);
    return res.status(204).send();
  });
}

import { Request, Response } from 'express';
import { CampaignService, CreateCampaignInput, UpdateCampaignInput } from '../services/campaign.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, ValidationError, NotFoundError } from '../../../utils/errors';

export class CampaignController {
  static listPublic = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const campaigns = await CampaignService.list(tenantId, { isActive: true });
    const activeCampaigns = campaigns.filter((c) => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return start <= today && today <= end;
    });
    sendSuccess(res, activeCampaigns);
  });

  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const campaigns = await CampaignService.list(tenantId, { isActive });
    sendSuccess(res, campaigns);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const campaign = await CampaignService.getById(id, tenantId);
    if (!campaign) throw new NotFoundError('Campaign', id);
    sendSuccess(res, campaign);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const input: CreateCampaignInput = {
      ...req.body,
      tenantId,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    };
    const campaign = await CampaignService.create(input);
    sendSuccess(res, campaign, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const input: UpdateCampaignInput = { ...req.body };
    if (input.startDate) input.startDate = new Date(input.startDate as any);
    if (input.endDate) input.endDate = new Date(input.endDate as any);

    const campaign = await CampaignService.update(id, tenantId, input);
    sendSuccess(res, campaign);
  });

  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    await CampaignService.delete(id, tenantId);
    sendSuccess(res, { message: 'Campaign deleted' });
  });

  static checkApplicable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { pickupLocationId, vehicleId, vehicleCategoryId, rentalDays, pickupDate, basePrice } = req.body;
    if (!pickupLocationId || !vehicleId || !rentalDays || !pickupDate) {
      throw new ValidationError('Missing required fields: pickupLocationId, vehicleId, rentalDays, pickupDate');
    }

    const applicableCampaigns = await CampaignService.findApplicableCampaigns({
      tenantId,
      pickupLocationId,
      vehicleId,
      vehicleCategoryId: vehicleCategoryId || null,
      rentalDays,
      pickupDate: new Date(pickupDate),
    });

    let discountResult = null;
    if (basePrice !== undefined) {
      const bestCampaign = CampaignService.selectBestCampaign(applicableCampaigns);
      if (bestCampaign) {
        const { discountAmount, finalPrice } = CampaignService.calculateDiscount(basePrice, bestCampaign);
        discountResult = {
          campaignId: bestCampaign.id,
          campaignName: bestCampaign.name,
          discountType: bestCampaign.discountType,
          discountPercent: bestCampaign.discountPercent || 0,
          discountAmount,
          finalPrice,
        };
      }
    }

    sendSuccess(res, {
      applicableCampaigns,
      bestCampaign: applicableCampaigns.length > 0 ? CampaignService.selectBestCampaign(applicableCampaigns) : null,
      discount: discountResult,
    });
  });

  static getQuote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { pickupLocationId, vehicleId, vehicleCategoryId, rentalDays, pickupDate, basePrice } = req.body;
    if (!pickupLocationId || !vehicleId || !rentalDays || !pickupDate || basePrice === undefined) {
      throw new ValidationError('Missing required fields: pickupLocationId, vehicleId, rentalDays, pickupDate, basePrice');
    }

    const discountResult = await CampaignService.getCampaignDiscount(
      {
        tenantId,
        pickupLocationId,
        vehicleId,
        vehicleCategoryId: vehicleCategoryId || null,
        rentalDays,
        pickupDate: new Date(pickupDate),
      },
      basePrice
    );

    sendSuccess(res, {
      basePrice,
      campaignDiscount: discountResult,
      finalPrice: discountResult ? discountResult.finalPrice : basePrice,
    });
  });
}


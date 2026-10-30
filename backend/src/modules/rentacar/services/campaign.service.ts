import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Campaign, DiscountType } from '../entities/campaign.entity';
import { Vehicle } from '../entities/vehicle.entity';

export type CreateCampaignInput = {
  tenantId: string;
  name: string;
  description?: string;
  pickupLocationId: string;
  vehicleId?: string | null;
  categoryId?: string | null;
  minRentalDays?: number | null;
  discountType: DiscountType;
  discountPercent?: number | null;
  discountFixed?: number | null;
  startDate: Date;
  endDate: Date;
  priority?: number;
  isActive?: boolean;
};

export type UpdateCampaignInput = Partial<Omit<CreateCampaignInput, 'tenantId'>>;

export type CampaignMatchInput = {
  tenantId: string;
  pickupLocationId: string;
  vehicleId: string;
  vehicleCategoryId?: string | null;
  rentalDays: number;
  pickupDate: Date; // Date when rental starts
};

export type CampaignDiscountResult = {
  campaignId: string;
  campaignName: string;
  discountType: DiscountType;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
};

export class CampaignService {
  private static campaignRepo(): Repository<Campaign> {
    return AppDataSource.getRepository(Campaign);
  }

  private static vehicleRepo(): Repository<Vehicle> {
    return AppDataSource.getRepository(Vehicle);
  }

  /**
   * Create a new campaign
   */
  static async create(input: CreateCampaignInput): Promise<Campaign> {
    // Validation
    if (input.vehicleId && input.categoryId) {
      throw new Error('Campaign cannot target both vehicle and category. Choose one.');
    }

    if (input.discountType === DiscountType.PERCENTAGE && !input.discountPercent) {
      throw new Error('Percentage discount requires discountPercent');
    }

    if (input.discountType === DiscountType.FIXED && !input.discountFixed) {
      throw new Error('Fixed discount requires discountFixed');
    }

    if (input.startDate >= input.endDate) {
      throw new Error('Start date must be before end date');
    }

    if (input.discountPercent !== null && input.discountPercent !== undefined && (input.discountPercent < 0 || input.discountPercent > 100)) {
      throw new Error('Discount percent must be between 0 and 100');
    }

    const campaign = this.campaignRepo().create({
      ...input,
      priority: input.priority ?? 0,
      isActive: input.isActive ?? true,
    });

    return this.campaignRepo().save(campaign);
  }

  /**
   * Update campaign
   */
  static async update(id: string, tenantId: string, input: UpdateCampaignInput): Promise<Campaign> {
    const campaign = await this.campaignRepo().findOne({
      where: { id, tenantId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Validation
    if (input.vehicleId && input.categoryId) {
      throw new Error('Campaign cannot target both vehicle and category. Choose one.');
    }

    if (input.startDate && input.endDate && input.startDate >= input.endDate) {
      throw new Error('Start date must be before end date');
    }

    if (input.discountPercent !== null && input.discountPercent !== undefined && (input.discountPercent < 0 || input.discountPercent > 100)) {
      throw new Error('Discount percent must be between 0 and 100');
    }

    Object.assign(campaign, input);
    return this.campaignRepo().save(campaign);
  }

  /**
   * Get campaign by ID
   */
  static async getById(id: string, tenantId: string): Promise<Campaign | null> {
    return this.campaignRepo().findOne({
      where: { id, tenantId },
      relations: ['pickupLocation', 'vehicle', 'category'],
    });
  }

  /**
   * List all campaigns for tenant
   */
  static async list(tenantId: string, filters?: { isActive?: boolean }): Promise<Campaign[]> {
    const where: any = { tenantId };
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.campaignRepo().find({
      where,
      relations: ['pickupLocation', 'vehicle', 'category'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Delete campaign
   */
  static async delete(id: string, tenantId: string): Promise<void> {
    const campaign = await this.campaignRepo().findOne({
      where: { id, tenantId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await this.campaignRepo().remove(campaign);
  }

  /**
   * Find applicable campaigns for a given reservation input
   * Returns campaigns that match all criteria
   */
  static async findApplicableCampaigns(input: CampaignMatchInput): Promise<Campaign[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pickupDate = new Date(input.pickupDate);
    pickupDate.setHours(0, 0, 0, 0);

    // Base query: active campaigns for tenant, within date range
    const campaigns = await this.campaignRepo().find({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        pickupLocationId: input.pickupLocationId,
        startDate: LessThanOrEqual(pickupDate),
        endDate: MoreThanOrEqual(pickupDate),
      },
      relations: ['pickupLocation', 'vehicle', 'category'],
    });

    // Filter campaigns by additional criteria
    const applicableCampaigns: Campaign[] = [];

    for (const campaign of campaigns) {
      // Check vehicle/category match
      if (campaign.vehicleId) {
        if (campaign.vehicleId !== input.vehicleId) {
          continue; // Vehicle doesn't match
        }
      } else if (campaign.categoryId) {
        if (campaign.categoryId !== input.vehicleCategoryId) {
          continue; // Category doesn't match
        }
      }
      // If neither vehicleId nor categoryId is set, campaign applies to all vehicles at this location

      // Check minimum rental days
      if (campaign.minRentalDays && input.rentalDays < campaign.minRentalDays) {
        continue; // Rental days requirement not met
      }

      applicableCampaigns.push(campaign);
    }

    return applicableCampaigns;
  }

  /**
   * Select the best campaign from applicable campaigns
   * Priority: highest discount percentage, then priority field, then created_at
   */
  static selectBestCampaign(campaigns: Campaign[]): Campaign | null {
    if (campaigns.length === 0) {
      return null;
    }

    if (campaigns.length === 1) {
      return campaigns[0];
    }

    // Sort by discount percentage (descending), then priority (descending), then created_at (ascending)
    const sorted = campaigns.sort((a, b) => {
      // Calculate effective discount for comparison
      const discountA = a.discountType === DiscountType.PERCENTAGE
        ? (a.discountPercent || 0)
        : 0; // For fixed, we'd need base price to compare, so prioritize percentage
      const discountB = b.discountType === DiscountType.PERCENTAGE
        ? (b.discountPercent || 0)
        : 0;

      // First: highest discount percentage
      if (discountA !== discountB) {
        return discountB - discountA;
      }

      // Second: highest priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Third: earliest created (deterministic tie-breaker)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return sorted[0];
  }

  /**
   * Calculate discount for a given base price and campaign
   */
  static calculateDiscount(basePrice: number, campaign: Campaign): {
    discountAmount: number;
    finalPrice: number;
  } {
    let discountAmount = 0;

    if (campaign.discountType === DiscountType.PERCENTAGE) {
      const percent = campaign.discountPercent || 0;
      discountAmount = (basePrice * percent) / 100;
    } else if (campaign.discountType === DiscountType.FIXED) {
      discountAmount = campaign.discountFixed || 0;
      // Ensure discount doesn't exceed base price
      if (discountAmount > basePrice) {
        discountAmount = basePrice;
      }
    }

    const finalPrice = Math.max(0, basePrice - discountAmount);

    return {
      discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimals
      finalPrice: Math.round(finalPrice * 100) / 100,
    };
  }

  /**
   * Get applicable campaign and calculate discount for a quote
   * This is the main function used in pricing calculation
   */
  static async getCampaignDiscount(
    input: CampaignMatchInput,
    basePrice: number
  ): Promise<CampaignDiscountResult | null> {
    const applicableCampaigns = await this.findApplicableCampaigns(input);

    if (applicableCampaigns.length === 0) {
      return null;
    }

    const bestCampaign = this.selectBestCampaign(applicableCampaigns);

    if (!bestCampaign) {
      return null;
    }

    const { discountAmount, finalPrice } = this.calculateDiscount(basePrice, bestCampaign);

    return {
      campaignId: bestCampaign.id,
      campaignName: bestCampaign.name,
      discountType: bestCampaign.discountType,
      discountPercent: bestCampaign.discountPercent || 0,
      discountAmount,
      finalPrice,
    };
  }
}


import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { MarketplaceListing, ServiceType, ListingStatus } from '../entities/marketplace-listing.entity';
import { TenantServiceAgreement, AgreementStatus } from '../entities/tenant-service-agreement.entity';

export type CreateListingInput = {
  tenantId: string;
  title: string;
  description?: string;
  serviceType: ServiceType;
  commissionType: string;
  commissionRate?: number;
  commissionFixed?: number;
  minCommission?: number;
  maxCommission?: number;
  basePrice?: number;
  currencyCode?: string;
  serviceConfig?: Record<string, any>;
  isAvailable?: boolean;
  availableFrom?: Date;
  availableTo?: Date;
  contactEmail?: string;
  contactPhone?: string;
  termsAndConditions?: string;
};

export type UpdateListingInput = Partial<Omit<CreateListingInput, 'tenantId'>>;

export type CreateAgreementInput = {
  providerTenantId: string;
  consumerTenantId: string;
  listingId: string;
  commissionType?: string;
  commissionRate?: number;
  commissionFixed?: number;
  minCommission?: number;
  maxCommission?: number;
  startDate?: Date;
  endDate?: Date;
  autoRenew?: boolean;
  customTerms?: string;
};

export class MarketplaceService {
  private static listingRepo(): Repository<MarketplaceListing> {
    return AppDataSource.getRepository(MarketplaceListing);
  }

  private static agreementRepo(): Repository<TenantServiceAgreement> {
    return AppDataSource.getRepository(TenantServiceAgreement);
  }

  /**
   * Create marketplace listing
   */
  static async createListing(input: CreateListingInput): Promise<MarketplaceListing> {
    const listing = this.listingRepo().create({
      tenantId: input.tenantId,
      title: input.title,
      description: input.description,
      serviceType: input.serviceType,
      commissionType: input.commissionType as any,
      commissionRate: input.commissionRate,
      commissionFixed: input.commissionFixed,
      minCommission: input.minCommission,
      maxCommission: input.maxCommission,
      basePrice: input.basePrice,
      currencyCode: input.currencyCode || 'TRY',
      serviceConfig: input.serviceConfig,
      isAvailable: input.isAvailable ?? true,
      availableFrom: input.availableFrom,
      availableTo: input.availableTo,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      termsAndConditions: input.termsAndConditions,
      status: ListingStatus.PENDING_APPROVAL,
    });

    return this.listingRepo().save(listing);
  }

  /**
   * Update listing
   */
  static async updateListing(
    id: string,
    tenantId: string,
    input: UpdateListingInput
  ): Promise<MarketplaceListing> {
    const listing = await this.listingRepo().findOne({
      where: { id, tenantId },
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    Object.assign(listing, input);
    return this.listingRepo().save(listing);
  }

  /**
   * List marketplace listings
   */
  static async listListings(filters?: {
    tenantId?: string;
    serviceType?: ServiceType;
    status?: ListingStatus;
    isAvailable?: boolean;
  }): Promise<MarketplaceListing[]> {
    const where: any = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.serviceType) where.serviceType = filters.serviceType;
    if (filters?.status) where.status = filters.status;
    if (filters?.isAvailable !== undefined) where.isAvailable = filters.isAvailable;

    return this.listingRepo().find({
      where,
      relations: ['tenant'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get listing by ID
   */
  static async getListing(id: string): Promise<MarketplaceListing | null> {
    return this.listingRepo().findOne({
      where: { id },
      relations: ['tenant'],
    });
  }

  /**
   * Delete listing
   */
  static async deleteListing(id: string, tenantId: string): Promise<void> {
    const listing = await this.listingRepo().findOne({
      where: { id, tenantId },
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    await this.listingRepo().remove(listing);
  }

  /**
   * Approve listing
   */
  static async approveListing(id: string, userId: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepo().findOne({
      where: { id },
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    listing.status = ListingStatus.ACTIVE;
    listing.approvedAt = new Date();
    listing.approvedByUserId = userId;

    return this.listingRepo().save(listing);
  }

  /**
   * Create service agreement
   */
  static async createAgreement(input: CreateAgreementInput): Promise<TenantServiceAgreement> {
    // Get listing to use default commission if not provided
    const listing = await this.getListing(input.listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    // Check if agreement already exists
    const existing = await this.agreementRepo().findOne({
      where: {
        providerTenantId: input.providerTenantId,
        consumerTenantId: input.consumerTenantId,
        listingId: input.listingId,
      },
    });

    if (existing) {
      throw new Error('Agreement already exists');
    }

    const agreement = this.agreementRepo().create({
      providerTenantId: input.providerTenantId,
      consumerTenantId: input.consumerTenantId,
      listingId: input.listingId,
      commissionType: input.commissionType || listing.commissionType,
      commissionRate: input.commissionRate ?? listing.commissionRate,
      commissionFixed: input.commissionFixed ?? listing.commissionFixed,
      minCommission: input.minCommission ?? listing.minCommission,
      maxCommission: input.maxCommission ?? listing.maxCommission,
      startDate: input.startDate,
      endDate: input.endDate,
      autoRenew: input.autoRenew ?? false,
      customTerms: input.customTerms,
      status: AgreementStatus.PENDING,
    });

    return this.agreementRepo().save(agreement);
  }

  /**
   * List agreements
   */
  static async listAgreements(filters?: {
    providerTenantId?: string;
    consumerTenantId?: string;
    status?: AgreementStatus;
  }): Promise<TenantServiceAgreement[]> {
    const where: any = {};
    if (filters?.providerTenantId) where.providerTenantId = filters.providerTenantId;
    if (filters?.consumerTenantId) where.consumerTenantId = filters.consumerTenantId;
    if (filters?.status) where.status = filters.status;

    return this.agreementRepo().find({
      where,
      relations: ['providerTenant', 'consumerTenant', 'listing'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get agreement by ID
   */
  static async getAgreement(id: string): Promise<TenantServiceAgreement | null> {
    return this.agreementRepo().findOne({
      where: { id },
      relations: ['providerTenant', 'consumerTenant', 'listing'],
    });
  }

  /**
   * Approve agreement (by provider or consumer)
   */
  static async approveAgreement(
    id: string,
    tenantId: string,
    isProvider: boolean
  ): Promise<TenantServiceAgreement> {
    const agreement = await this.agreementRepo().findOne({
      where: { id },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Verify tenant
    if (isProvider && agreement.providerTenantId !== tenantId) {
      throw new Error('Unauthorized');
    }
    if (!isProvider && agreement.consumerTenantId !== tenantId) {
      throw new Error('Unauthorized');
    }

    if (isProvider) {
      agreement.approvedByProvider = true;
    } else {
      agreement.approvedByConsumer = true;
    }

    // If both approved, activate
    if (agreement.approvedByProvider && agreement.approvedByConsumer) {
      agreement.status = AgreementStatus.ACTIVE;
      agreement.activatedAt = new Date();
    }

    agreement.approvedAt = new Date();

    return this.agreementRepo().save(agreement);
  }

  /**
   * Suspend agreement
   */
  static async suspendAgreement(id: string, tenantId: string): Promise<TenantServiceAgreement> {
    const agreement = await this.agreementRepo().findOne({
      where: { id },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Verify tenant is either provider or consumer
    if (agreement.providerTenantId !== tenantId && agreement.consumerTenantId !== tenantId) {
      throw new Error('Unauthorized');
    }

    agreement.status = AgreementStatus.SUSPENDED;
    agreement.suspendedAt = new Date();

    return this.agreementRepo().save(agreement);
  }

  /**
   * Terminate agreement
   */
  static async terminateAgreement(id: string, tenantId: string): Promise<TenantServiceAgreement> {
    const agreement = await this.agreementRepo().findOne({
      where: { id },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    // Verify tenant is either provider or consumer
    if (agreement.providerTenantId !== tenantId && agreement.consumerTenantId !== tenantId) {
      throw new Error('Unauthorized');
    }

    agreement.status = AgreementStatus.TERMINATED;
    agreement.terminatedAt = new Date();

    return this.agreementRepo().save(agreement);
  }
}


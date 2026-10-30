import { Response } from 'express';
import { MarketplaceService } from '../services/marketplace.service';
import { CommissionService } from '../services/commission.service';
import { ServiceType, ListingStatus } from '../entities/marketplace-listing.entity';
import { AgreementStatus } from '../entities/tenant-service-agreement.entity';
import { TransactionStatus, TransactionType } from '../entities/commission-transaction.entity';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError } from '../../../utils/errors';

export class MarketplaceController {
  static createListing = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const listing = await MarketplaceService.createListing({ ...req.body, tenantId });
    sendSuccess(res, listing, 201);
  });

  static listListings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const filters: any = {};
    if (req.query.myListings === 'true' && tenantId) filters.tenantId = tenantId;
    else filters.status = ListingStatus.ACTIVE;
    if (req.query.serviceType) filters.serviceType = req.query.serviceType as ServiceType;
    if (req.query.isAvailable !== undefined) filters.isAvailable = req.query.isAvailable === 'true';

    const listings = await MarketplaceService.listListings(filters);
    sendSuccess(res, listings);
  });

  static getListing = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const listing = await MarketplaceService.getListing(id);
    if (!listing) throw new NotFoundError('Listing', id);
    sendSuccess(res, listing);
  });

  static updateListing = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const listing = await MarketplaceService.updateListing(id, tenantId, req.body);
    sendSuccess(res, listing);
  });

  static deleteListing = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    await MarketplaceService.deleteListing(id, tenantId);
    sendSuccess(res, { message: 'Listing deleted' });
  });

  static approveListing = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const listing = await MarketplaceService.approveListing(id, tenantId);
    sendSuccess(res, listing);
  });

  static createAgreement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const consumerTenantId = req.auth?.tenantId;
    if (!consumerTenantId) throw new UnauthorizedError('Authentication required');

    const agreement = await MarketplaceService.createAgreement({ ...req.body, consumerTenantId });
    sendSuccess(res, agreement, 201);
  });

  static listAgreements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const filters: any = {};
    if (req.query.asProvider === 'true') filters.providerTenantId = tenantId;
    else if (req.query.asConsumer === 'true') filters.consumerTenantId = tenantId;
    else {
      filters.providerTenantId = tenantId;
      filters.consumerTenantId = tenantId;
    }
    if (req.query.status) filters.status = req.query.status as AgreementStatus;

    const agreements = await MarketplaceService.listAgreements(filters);
    sendSuccess(res, agreements);
  });

  static getAgreement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const agreement = await MarketplaceService.getAgreement(id);
    if (!agreement) throw new NotFoundError('Agreement', id);
    sendSuccess(res, agreement);
  });

  static approveAgreement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const isProvider = req.body.isProvider === true;
    const agreement = await MarketplaceService.approveAgreement(id, tenantId, isProvider);
    sendSuccess(res, agreement);
  });

  static suspendAgreement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const agreement = await MarketplaceService.suspendAgreement(id, tenantId);
    sendSuccess(res, agreement);
  });

  static terminateAgreement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id } = req.params;
    const agreement = await MarketplaceService.terminateAgreement(id, tenantId);
    sendSuccess(res, agreement);
  });

  static calculateCommission = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { agreementId, transactionAmount } = req.body;
    const agreement = await MarketplaceService.getAgreement(agreementId);
    if (!agreement) throw new NotFoundError('Agreement', agreementId);

    const result = CommissionService.calculateCommission(agreement, transactionAmount);
    sendSuccess(res, result);
  });

  static createTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const transaction = await CommissionService.createTransaction(req.body);
    sendSuccess(res, transaction, 201);
  });

  static listTransactions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const filters: any = {};
    if (req.query.asProvider === 'true') filters.providerTenantId = tenantId;
    else if (req.query.asConsumer === 'true') filters.consumerTenantId = tenantId;
    if (req.query.agreementId) filters.agreementId = req.query.agreementId as string;
    if (req.query.status) filters.status = req.query.status as TransactionStatus;
    if (req.query.type) filters.type = req.query.type as TransactionType;
    if (req.query.fromDate) filters.fromDate = new Date(req.query.fromDate as string);
    if (req.query.toDate) filters.toDate = new Date(req.query.toDate as string);

    const transactions = await CommissionService.listTransactions(filters);
    sendSuccess(res, transactions);
  });

  static getCommissionSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const asProvider = req.query.asProvider === 'true';
    const summary = await CommissionService.getCommissionSummary(tenantId, asProvider);
    sendSuccess(res, summary);
  });
}

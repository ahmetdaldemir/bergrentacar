import { Request, Response } from 'express';
import {
  TransferReservationService,
  CreateTransferReservationInput,
  UpdateTransferReservationInput,
  TransferReservationFilters,
  TransferReservationSearchFilters,
} from '../services/transfer-reservation.service';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, UnauthorizedError } from '../../../utils/errors';
import { getTenantIdFromAuth } from '../../../utils/validation';
import { getPaginationFromQuery } from '../../../utils/pagination';
import { TransferOperationsService } from '../services/transfer-operations.service';
import { TransferStripeDriverService } from '../services/transfer-stripe-driver.service';

function requireTenantId(req: Request): string {
  const tenantId = getTenantIdFromAuth(req);
  if (!tenantId) throw new UnauthorizedError('Authentication required');
  return tenantId;
}

export class TransferReservationController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const filters: TransferReservationFilters = {
      tenantId,
      status: req.query.status as any,
      vehicleId: req.query.vehicleId as string,
      routeId: req.query.routeId as string,
      driverId: req.query.driverId as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    };
    const reservations = await TransferReservationService.list(filters);
    sendSuccess(res, reservations);
  });

  static search = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const pagination = getPaginationFromQuery(req.query, { defaultLimit: 20, maxLimit: 100 });
    const filters: TransferReservationSearchFilters = {
      tenantId,
      search: req.query.search as string,
      status: req.query.status as any,
      vehicleId: req.query.vehicleId as string,
      vehicleType: typeof req.query.vehicleType === 'string' ? req.query.vehicleType : undefined,
      routeId: req.query.routeId as string,
      driverId: req.query.driverId as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      isRoundTrip: req.query.isRoundTrip === 'true' ? true : req.query.isRoundTrip === 'false' ? false : undefined,
      paymentStatus: req.query.paymentStatus as string,
      page: pagination.page,
      limit: pagination.limit,
      sortBy: (pagination.sortBy as TransferReservationSearchFilters['sortBy']) || undefined,
      sortOrder: pagination.sortOrder ? (pagination.sortOrder.toUpperCase() as 'ASC' | 'DESC') : undefined,
    };
    const result = await TransferReservationService.search(filters);
    sendSuccess(res, result);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const reservation = await TransferReservationService.getById(id, tenantId);
    if (!reservation) throw new NotFoundError('Transfer reservation', id);
    sendSuccess(res, reservation);
  });

  static getByReference = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { reference } = req.params;
    const reservation = await TransferReservationService.getByReference(reference, tenantId);
    if (!reservation) throw new NotFoundError('Transfer reservation', reference);
    sendSuccess(res, reservation);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const input: CreateTransferReservationInput = { ...req.body, tenantId };
    const reservation = await TransferReservationService.create(input);
    sendSuccess(res, reservation, 201);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const input: UpdateTransferReservationInput = req.body;
    const reservation = await TransferReservationService.update(id, tenantId, input);
    sendSuccess(res, reservation);
  });

  static updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const { status } = req.body;
    if (!status) throw new ValidationError('status is required');
    const reservation = await TransferReservationService.updateStatus(id, tenantId, status);
    sendSuccess(res, reservation);
  });

  static assignDriver = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const { driverId } = req.body;
    const reservation = await TransferReservationService.assignDriver(id, tenantId, driverId || null);
    sendSuccess(res, reservation);
  });

  static getEta = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const eta = await TransferOperationsService.getEtaForReservation(id, tenantId);
    if (!eta) throw new NotFoundError('Transfer reservation or coordinates', id);
    sendSuccess(res, eta);
  });

  /** Atanan aracın Mobilize GPS konumu (transfer_vehicles.tracking_plate_number) */
  static getVehicleTracking = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const payload = await TransferReservationService.getVehicleTrackingForReservation(id, tenantId);
    if (!payload) throw new NotFoundError('Transfer reservation', id);
    sendSuccess(res, payload);
  });

  static assignVehicle = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const { vehicleId } = req.body;
    if (!vehicleId) throw new ValidationError('vehicleId is required');
    const reservation = await TransferReservationService.assignVehicle(id, tenantId, vehicleId);
    sendSuccess(res, reservation);
  });

  static confirmDriverCash = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const { amount, currencyCode } = req.body;
    if (amount == null || amount === '') throw new ValidationError('amount is required');
    const reservation = await TransferReservationService.confirmDriverCash(id, tenantId, {
      amount: Number(amount),
      currencyCode: currencyCode || 'TRY',
    });
    sendSuccess(res, reservation);
  });

  /** Nakit / havale / fiziki kart */
  static confirmDriverPayment = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const { amount, currencyCode, paymentMethod } = req.body;
    if (amount == null || amount === '') throw new ValidationError('amount is required');
    const pm = paymentMethod as string;
    if (!pm || !['cash', 'bank_transfer', 'credit_card'].includes(pm)) {
      throw new ValidationError('paymentMethod: cash | bank_transfer | credit_card');
    }
    const reservation = await TransferReservationService.confirmDriverPayment(id, tenantId, {
      amount: Number(amount),
      currencyCode: currencyCode || 'TRY',
      paymentMethod: pm as 'cash' | 'bank_transfer' | 'credit_card',
    });
    sendSuccess(res, reservation);
  });

  static createStripePaymentIntent = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const { amount, currencyCode } = req.body;
    if (amount == null || amount === '') throw new ValidationError('amount is required');
    const cur = (currencyCode as string) || 'EUR';
    await TransferReservationService.assertDriverPaymentAmountWithinRemaining(
      tenantId,
      id,
      Number(amount),
      cur
    );
    const result = await TransferStripeDriverService.createPaymentIntent(
      tenantId,
      id,
      Number(amount),
      cur
    );
    sendSuccess(res, result);
  });

  static completeStripePayment = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const { paymentIntentId } = req.body;
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      throw new ValidationError('paymentIntentId is required');
    }
    const reservation = await TransferReservationService.completeDriverStripePayment(
      id,
      tenantId,
      paymentIntentId
    );
    sendSuccess(res, reservation);
  });

  static redirectVehicle = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    const { targetReservationId, alternateVehicleIdForSource } = req.body;
    if (!targetReservationId) throw new ValidationError('targetReservationId is required');
    if (!alternateVehicleIdForSource) throw new ValidationError('alternateVehicleIdForSource is required');
    const result = await TransferReservationService.redirectVehicle(
      id,
      tenantId,
      targetReservationId,
      alternateVehicleIdForSource
    );
    sendSuccess(res, result);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { id } = req.params;
    await TransferReservationService.delete(id, tenantId);
    res.status(204).send();
  });
}


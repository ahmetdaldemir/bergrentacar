import { Request, Response } from 'express';
import { CurrencyService } from '../services/currency.service';
import { CurrencyCode } from '../entities/currency.entity';
import { asyncHandler, sendSuccess, ValidationError } from '../../../utils/errors';

export class CurrencyController {
  static list = asyncHandler(async (_req: Request, res: Response) => {
    const currencies = await CurrencyService.list();
    sendSuccess(res, currencies);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const { code, name, symbol, rateToTry, isBaseCurrency, isActive, autoUpdate } = req.body;
    if (!code || !name) throw new ValidationError('code and name are required');
    if (!Object.values(CurrencyCode).includes(code)) throw new ValidationError('invalid currency code');
    const currency = await CurrencyService.create({ code, name, symbol, rateToTry, isBaseCurrency, isActive, autoUpdate });
    sendSuccess(res, currency, 201);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { code, name, symbol, rateToTry, isBaseCurrency, isActive, autoUpdate } = req.body;
    const currency = await CurrencyService.update(id, { code, name, symbol, rateToTry, isBaseCurrency, isActive, autoUpdate });
    sendSuccess(res, currency);
  });

  static updateRate = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const { rateToTry } = req.body;
    if (!rateToTry || typeof rateToTry !== 'number') throw new ValidationError('rateToTry is required and must be a number');
    if (!Object.values(CurrencyCode).includes(code as CurrencyCode)) throw new ValidationError('invalid currency code');
    const currency = await CurrencyService.updateRate(code as CurrencyCode, rateToTry);
    sendSuccess(res, currency);
  });

  static updateRates = asyncHandler(async (req: Request, res: Response) => {
    await CurrencyService.updateExchangeRates();
    const currencies = await CurrencyService.list();
    sendSuccess(res, { message: 'Exchange rates updated successfully', currencies });
  });

  static updateSingleRate = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    if (!Object.values(CurrencyCode).includes(code as CurrencyCode)) throw new ValidationError('invalid currency code');
    const currency = await CurrencyService.updateSingleCurrencyRate(code as CurrencyCode);
    sendSuccess(res, currency);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await CurrencyService.remove(id);
    res.status(204).send();
  });
}


import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Currency, CurrencyCode } from '../entities/currency.entity';
import axios from 'axios';
import { invalidatePublicApiCurrenciesListCache } from '../../../middleware/api-public-response-cache.middleware';
import { ValidationError } from '../../../utils/errors';

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type CreateCurrencyInput = {
  code: CurrencyCode;
  name: string;
  symbol?: string;
  rateToTry?: number;
  isBaseCurrency?: boolean;
  isActive?: boolean;
  autoUpdate?: boolean;
};

export type UpdateCurrencyInput = Partial<CreateCurrencyInput>;

export class CurrencyService {
  private static repository(): Repository<Currency> {
    return AppDataSource.getRepository(Currency);
  }

  private static async invalidatePublicListCache(): Promise<void> {
    try {
      await invalidatePublicApiCurrenciesListCache();
    } catch {
      // Redis yok / hata — sessiz
    }
  }

  static async list(): Promise<Currency[]> {
    return this.repository().find({
      order: { code: 'ASC' },
    });
  }

  static async getByCode(code: CurrencyCode): Promise<Currency | null> {
    return this.repository().findOne({ where: { code } });
  }

  /**
   * `rate_to_try` üzerinden çapraz kur: from → TRY → to.
   * Eksik para birimi veya geçersiz kurda ValidationError.
   */
  static async convertAmount(amount: number, fromCode: string, toCode: string): Promise<number> {
    const from = fromCode.slice(0, 3).toUpperCase();
    const to = toCode.slice(0, 3).toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('Geçerli bir tutar girin');
    }
    if (from === to) return roundMoney2(amount);

    const repo = this.repository();
    const fromCur = await repo.findOne({ where: { code: from as CurrencyCode } });
    const toCur = await repo.findOne({ where: { code: to as CurrencyCode } });
    if (!fromCur || !toCur) {
      throw new ValidationError(
        `Kur tanımı eksik: ${!fromCur ? from : to}. Para birimi listesinde bu kodları aktif tutun.`
      );
    }
    const rFrom = Number(fromCur.rateToTry);
    const rTo = Number(toCur.rateToTry);
    if (!Number.isFinite(rFrom) || rFrom <= 0 || !Number.isFinite(rTo) || rTo <= 0) {
      throw new ValidationError('Geçersiz kur bilgisi');
    }

    const amountTry = fromCur.isBaseCurrency ? amount : amount * rFrom;
    const result = toCur.isBaseCurrency ? amountTry : amountTry / rTo;
    return roundMoney2(result);
  }

  static async create(input: CreateCurrencyInput): Promise<Currency> {
    const repo = this.repository();
    const existing = await repo.findOne({ where: { code: input.code } });
    if (existing) {
      throw new Error(`Currency with code ${input.code} already exists`);
    }

    const currency = repo.create({
      code: input.code,
      name: input.name,
      symbol: input.symbol,
      rateToTry: input.rateToTry ?? (input.isBaseCurrency ? 1.0 : 1.0),
      isBaseCurrency: input.isBaseCurrency ?? false,
      isActive: input.isActive ?? true,
      autoUpdate: input.autoUpdate ?? true,
      lastUpdatedAt: new Date(),
    });

    const saved = await repo.save(currency);
    await this.invalidatePublicListCache();
    return saved;
  }

  static async update(id: string, input: UpdateCurrencyInput): Promise<Currency> {
    const repo = this.repository();
    const currency = await repo.findOne({ where: { id } });
    if (!currency) {
      throw new Error('Currency not found');
    }

    // Base currency olarak işaretlenirse rateToTry'ı 1.0 yap
    if (input.isBaseCurrency === true) {
      input.rateToTry = 1.0;
    }

    Object.assign(currency, {
      ...input,
      lastUpdatedAt: input.rateToTry ? new Date() : currency.lastUpdatedAt,
    });

    const saved = await repo.save(currency);
    await this.invalidatePublicListCache();
    return saved;
  }

  static async updateRate(code: CurrencyCode, rateToTry: number): Promise<Currency> {
    const repo = this.repository();
    const currency = await repo.findOne({ where: { code } });
    if (!currency) {
      throw new Error(`Currency with code ${code} not found`);
    }

    if (currency.isBaseCurrency && rateToTry !== 1.0) {
      throw new Error('Base currency rate must be 1.0');
    }

    currency.rateToTry = rateToTry;
    currency.lastUpdatedAt = new Date();

    const saved = await repo.save(currency);
    await this.invalidatePublicListCache();
    return saved;
  }

  static async remove(id: string): Promise<void> {
    const repo = this.repository();
    const currency = await repo.findOne({ where: { id } });
    if (!currency) {
      throw new Error('Currency not found');
    }

    if (currency.isBaseCurrency) {
      throw new Error('Cannot delete base currency');
    }

    await repo.remove(currency);
    await this.invalidatePublicListCache();
  }

  /**
   * Döviz kurlarını otomatik günceller
   * TCMB veya ücretsiz API kullanarak TL bazlı kurları çeker
   */
  static async updateExchangeRates(): Promise<void> {
    const repo = this.repository();
    
    // Base currency (TRY) hariç aktif ve auto-update açık currency'leri al
    const currencies = await repo.find({
      where: { isActive: true, autoUpdate: true, isBaseCurrency: false },
    });

    if (currencies.length === 0) {
      console.log('No currencies to update');
      return;
    }

    try {
      // Ücretsiz exchangerate-api.com kullanıyoruz
      // Base currency TRY olduğu için tersine çevirmemiz gerekiyor
      const baseCode = 'TRY';
      const codes = currencies.map((c) => c.code).join(',');
      
      // API'den kurları çek (TRY bazlı)
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCode}`, {
        timeout: 10000,
      });

      const rates = response.data.rates;

      // Her currency için kur güncelle
      for (const currency of currencies) {
        const rate = rates[currency.code];
        if (rate) {
          // API TRY bazlı kur döndürüyor (1 TRY = X EUR formatında)
          // Bizim ihtiyacımız 1 birim foreign currency = X TRY formatı
          // Örneğin API: 1 TRY = 0.028 EUR dönerse, biz 1 EUR = 35.71 TRY saklamalıyız
          currency.rateToTry = parseFloat((1 / parseFloat(rate)).toFixed(4));
          currency.lastUpdatedAt = new Date();
          await repo.save(currency);
          console.log(`Updated ${currency.code} rate to ${currency.rateToTry} TRY`);
        }
      }

      console.log(`✅ Currency rates updated successfully at ${new Date().toISOString()}`);
      await this.invalidatePublicListCache();
    } catch (error) {
      console.error('Failed to update exchange rates:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Belirli bir currency için kur günceller
   */
  static async updateSingleCurrencyRate(code: CurrencyCode): Promise<Currency> {
    const repo = this.repository();
    const currency = await repo.findOne({ where: { code } });

    if (!currency) {
      throw new Error(`Currency with code ${code} not found`);
    }

    if (currency.isBaseCurrency) {
      throw new Error('Cannot update base currency rate');
    }

    try {
      const baseCode = 'TRY';
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCode}`, {
        timeout: 10000,
      });

      const rates = response.data.rates;
      const rate = rates[code];

      if (rate) {
        // API TRY bazlı kur döndürüyor, bizim ihtiyacımız 1 birim foreign currency = X TRY
        currency.rateToTry = parseFloat((1 / parseFloat(rate)).toFixed(4));
        currency.lastUpdatedAt = new Date();
        const saved = await repo.save(currency);
        await this.invalidatePublicListCache();
        return saved;
      } else {
        throw new Error(`Rate not found for ${code}`);
      }
    } catch (error) {
      console.error(`Failed to update ${code} rate:`, (error as Error).message);
      throw error;
    }
  }
}


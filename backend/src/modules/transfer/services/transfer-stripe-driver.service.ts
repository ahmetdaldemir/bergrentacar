import Stripe from 'stripe';
import { AppDataSource } from '../../../config/data-source';
import { PaymentMethod, PaymentProvider } from '../../shared/entities/payment-method.entity';
import { ValidationError } from '../../../utils/errors';

const ZERO_DECIMAL = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

export function amountToStripeMinorUnits(amount: number, currency: string): number {
  const c = currency.toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (ZERO_DECIMAL.has(c)) return Math.round(amount);
  return Math.round(amount * 100);
}

export function amountFromStripeMinorUnits(amountMinor: number, currency: string): number {
  const c = currency.toLowerCase();
  if (ZERO_DECIMAL.has(c)) return amountMinor;
  return amountMinor / 100;
}

/**
 * Tenant PaymentMethod (Stripe) + şoför uygulaması PaymentIntent.
 */
export class TransferStripeDriverService {
  static async getStripeKeysForTenant(
    tenantId: string
  ): Promise<{ secretKey: string; publishableKey: string } | null> {
    const repo = AppDataSource.getRepository(PaymentMethod);
    const pm = await repo.findOne({
      where: { tenantId, provider: PaymentProvider.STRIPE, isActive: true },
    });
    const cfg = (pm?.config ?? {}) as Record<string, unknown>;
    const secretKey =
      (typeof cfg.secretKey === 'string' && cfg.secretKey) ||
      (typeof cfg.stripeSecretKey === 'string' && cfg.stripeSecretKey) ||
      '';
    const publishableKey =
      (typeof cfg.publishableKey === 'string' && cfg.publishableKey) ||
      (typeof cfg.publishable_key === 'string' && cfg.publishable_key) ||
      '';
    if (!secretKey || !publishableKey) return null;
    return { secretKey, publishableKey };
  }

  static async createPaymentIntent(
    tenantId: string,
    transferReservationId: string,
    amount: number,
    currencyCode: string
  ): Promise<{ clientSecret: string; publishableKey: string; paymentIntentId: string }> {
    const keys = await this.getStripeKeysForTenant(tenantId);
    if (!keys) {
      throw new ValidationError(
        'Stripe yapılandırması yok. Panelde ödeme yöntemlerine Stripe (secret + publishable key) ekleyin.'
      );
    }

    const stripe = new Stripe(keys.secretKey);
    const currency = currencyCode.slice(0, 3).toLowerCase();
    const amountMinor = amountToStripeMinorUnits(amount, currency);
    if (amountMinor < 1) throw new ValidationError('Geçerli bir tutar girin');

    const pi = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        tenantId,
        transferReservationId,
      },
    });

    if (!pi.client_secret) throw new ValidationError('Stripe ödeme oturumu oluşturulamadı');

    return {
      clientSecret: pi.client_secret,
      publishableKey: keys.publishableKey,
      paymentIntentId: pi.id,
    };
  }

  static async assertPaymentSucceeded(
    tenantId: string,
    transferReservationId: string,
    paymentIntentId: string
  ): Promise<{ amount: number; currency: string }> {
    const keys = await this.getStripeKeysForTenant(tenantId);
    if (!keys) throw new ValidationError('Stripe yapılandırması yok.');

    const stripe = new Stripe(keys.secretKey);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      throw new ValidationError(`Ödeme henüz tamamlanmadı (durum: ${pi.status})`);
    }
    if (pi.metadata?.transferReservationId !== transferReservationId || pi.metadata?.tenantId !== tenantId) {
      throw new ValidationError('Ödeme bu rezervasyonla eşleşmiyor');
    }

    const cur = (pi.currency || 'eur').toUpperCase();
    const received = pi.amount_received ?? pi.amount ?? 0;
    const amount = amountFromStripeMinorUnits(received, cur);
    return { amount, currency: cur };
  }
}

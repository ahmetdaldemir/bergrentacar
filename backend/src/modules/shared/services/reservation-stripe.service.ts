import Stripe from 'stripe';
import { ValidationError } from '../../../utils/errors';
import {
  TransferStripeDriverService,
  amountFromStripeMinorUnits,
  amountToStripeMinorUnits,
} from '../../transfer/services/transfer-stripe-driver.service';

/**
 * Tur / rentacar ortak rezervasyonları için Stripe PaymentIntent (metadata: reservationId).
 */
export class ReservationStripeService {
  static async createPaymentIntent(
    tenantId: string,
    reservationId: string,
    amount: number,
    currencyCode: string
  ): Promise<{ clientSecret: string; publishableKey: string; paymentIntentId: string }> {
    const keys = await TransferStripeDriverService.getStripeKeysForTenant(tenantId);
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
        reservationId,
        kind: 'shared_reservation',
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
    reservationId: string,
    paymentIntentId: string
  ): Promise<{ amount: number; currency: string }> {
    const keys = await TransferStripeDriverService.getStripeKeysForTenant(tenantId);
    if (!keys) throw new ValidationError('Stripe yapılandırması yok.');

    const stripe = new Stripe(keys.secretKey);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      throw new ValidationError(`Ödeme henüz tamamlanmadı (durum: ${pi.status})`);
    }
    if (
      pi.metadata?.reservationId !== reservationId ||
      pi.metadata?.tenantId !== tenantId ||
      pi.metadata?.kind !== 'shared_reservation'
    ) {
      throw new ValidationError('Ödeme bu rezervasyonla eşleşmiyor');
    }

    const cur = (pi.currency || 'eur').toUpperCase();
    const received = pi.amount_received ?? pi.amount ?? 0;
    const amount = amountFromStripeMinorUnits(received, cur);
    return { amount, currency: cur };
  }
}

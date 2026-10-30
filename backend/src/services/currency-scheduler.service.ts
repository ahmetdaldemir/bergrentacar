import * as cron from 'node-cron';
import { CurrencyService } from '../modules/shared/services/currency.service';

let cronJob: cron.ScheduledTask | null = null;

/**
 * Currency güncelleme scheduler'ı başlatır
 * Her gün saat 10:10'da otomatik güncelleme yapar
 */
export const startCurrencyScheduler = () => {
  // İlk çalıştırmada hemen güncelle
  CurrencyService.updateExchangeRates().catch((error) => {
    console.error('Initial currency update failed:', error);
  });

  // Her gün saat 10:10'da çalışacak cron job
  // Cron pattern: "10 10 * * *" = dakika saat gün ay hafta
  // 10 dakika, 10 saat, her gün, her ay, her hafta günü
  // Not: Sunucu saat dilimine göre çalışır (Türkiye saati için sunucu timezone'u ayarlanmalı)
  cronJob = cron.schedule('10 10 * * *', async () => {
    try {
      console.log(`[${new Date().toISOString()}] Starting scheduled currency update (cron: daily at 10:10)...`);
      await CurrencyService.updateExchangeRates();
      console.log(`[${new Date().toISOString()}] Scheduled currency update completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Scheduled currency update failed:`, (error as Error).message);
    }
  });

  console.log('✅ Currency scheduler started (updates daily at 10:10 AM Turkey time)');
};

/**
 * Currency scheduler'ı durdurur
 */
export const stopCurrencyScheduler = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('Currency scheduler stopped');
  }
};


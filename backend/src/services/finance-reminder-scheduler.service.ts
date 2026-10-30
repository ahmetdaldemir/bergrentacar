import * as cron from 'node-cron';
import { In } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { FinanceCheck, FinanceCheckStatus } from '../modules/finance/entities/finance-check.entity';
import { FinanceLoanInstallment, FinanceLoanInstallmentStatus } from '../modules/finance/entities/finance-loan-installment.entity';
import { FinanceLoanInstallmentService } from '../modules/finance/services/finance-loan-installment.service';
import { logger } from '../utils/logger';

let cronJob: cron.ScheduledTask | null = null;

const REMINDER_DAYS_BEFORE = 3; // Remind 3 days before due date

/**
 * Finance reminder scheduler'ı başlatır
 * Her gün saat 09:00'da (Turkey time) çalışır
 * Vadesi yaklaşan çek/senet ve kredi taksitleri için reminder oluşturur
 */
export const startFinanceReminderScheduler = () => {
  // İlk çalıştırmada hemen güncelle
  checkAndUpdateReminders().catch((error) => {
    logger.error('Initial finance reminder check failed:', error);
  });

  // Her gün saat 09:00'da çalışacak cron job (Turkey time - Europe/Istanbul)
  // Cron pattern: "0 9 * * *" = 0 dakika, 9 saat, her gün, her ay, her hafta günü
  cronJob = cron.schedule('0 9 * * *', async () => {
    try {
      logger.info(`[${new Date().toISOString()}] Starting scheduled finance reminder check...`);
      await checkAndUpdateReminders();
      logger.info(`[${new Date().toISOString()}] Scheduled finance reminder check completed`);
    } catch (error) {
      logger.error(`[${new Date().toISOString()}] Scheduled finance reminder check failed:`, (error as Error).message);
    }
  }, {
    timezone: 'Europe/Istanbul',
  });

  logger.info('✅ Finance reminder scheduler started (checks daily at 09:00 AM Turkey time)');
};

/**
 * Finance reminder scheduler'ı durdurur
 */
export const stopFinanceReminderScheduler = () => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Finance reminder scheduler stopped');
  }
};

/**
 * Vadesi yaklaşan veya geçmiş öğeleri kontrol eder ve reminder'ları günceller
 */
async function checkAndUpdateReminders() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + REMINDER_DAYS_BEFORE);

    // Get all tenants (from checks and installments)
    const checkRepo = AppDataSource.getRepository(FinanceCheck);
    const installmentRepo = AppDataSource.getRepository(FinanceLoanInstallment);

    const allTenantIds = new Set<string>();

    // Get unique tenant IDs from checks
    const checks = await checkRepo.find({
      select: ['tenantId'],
    });
    checks.forEach(c => allTenantIds.add(c.tenantId));

    // Get unique tenant IDs from installments
    const installments = await installmentRepo.find({
      select: ['tenantId'],
    });
    installments.forEach(i => allTenantIds.add(i.tenantId));

    // Process reminders for each tenant
    for (const tenantId of allTenantIds) {
      await processTenantReminders(tenantId, today, threeDaysLater);
    }

    // Update installment statuses for all tenants
    for (const tenantId of allTenantIds) {
      await FinanceLoanInstallmentService.updateStatuses(tenantId);
    }
  } catch (error) {
    logger.error('Error in finance reminder check:', error);
    throw error;
  }
}

/**
 * Belirli bir tenant için reminder'ları işler
 */
async function processTenantReminders(tenantId: string, today: Date, threeDaysLater: Date) {
  const checkRepo = AppDataSource.getRepository(FinanceCheck);
  const installmentRepo = AppDataSource.getRepository(FinanceLoanInstallment);

  // Find checks due soon or overdue
  const checks = await checkRepo.find({
    where: {
      tenantId,
      status: In([
        FinanceCheckStatus.IN_PORTFOLIO,
        FinanceCheckStatus.ENDORSED,
      ]),
    },
  });

  for (const check of checks) {
    const maturityDate = new Date(check.maturityDate);
    maturityDate.setHours(0, 0, 0, 0);

    const shouldRemind = (maturityDate >= today && maturityDate <= threeDaysLater) || maturityDate < today;

    if (shouldRemind && !check.reminderSentAt) {
      // Create reminder notification (you can extend this to create actual notification records)
      logger.info(`Finance Reminder: Check ${check.checkNo || check.id} is due on ${check.maturityDate} for tenant ${tenantId}`);
      
      // Update reminder_sent_at
      check.reminderSentAt = new Date();
      await checkRepo.save(check);
    }
  }

  // Find installments due soon or overdue
  const installments = await installmentRepo.find({
    where: {
      tenantId,
      status: In([
        FinanceLoanInstallmentStatus.PLANNED,
        FinanceLoanInstallmentStatus.DUE,
        FinanceLoanInstallmentStatus.OVERDUE,
      ]),
    },
    relations: ['loan'],
  });

  for (const installment of installments) {
    const dueDate = new Date(installment.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const shouldRemind = (dueDate >= today && dueDate <= threeDaysLater) || dueDate < today;

    if (shouldRemind && !installment.reminderSentAt) {
      // Create reminder notification
      logger.info(
        `Finance Reminder: Loan installment ${installment.installmentNo} (Loan: ${(installment.loan as any).title}) ` +
        `is due on ${installment.dueDate} for tenant ${tenantId}`
      );
      
      // Update reminder_sent_at
      installment.reminderSentAt = new Date();
      await installmentRepo.save(installment);
    }
  }
}


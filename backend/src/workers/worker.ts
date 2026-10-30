import { AppDataSource } from '../config/data-source';
import { EmailWorker } from './email.worker';
import { assertBergrentacarDomainExists, assertInstallationAllowed, startBergrentacarDomainWatch } from '../security/bergrentacar-site';

/**
 * Worker process entry point
 * Bu dosya ayrı bir process olarak çalıştırılır
 */
async function startWorker() {
  assertInstallationAllowed();
  await assertBergrentacarDomainExists();
  startBergrentacarDomainWatch();
  console.log('🚀 Starting worker process...');

  try {
    // Database bağlantısını başlat
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Email worker'ı başlat (sadece USE_EMAIL_QUEUE=true ise)
    const useEmailQueue = process.env.USE_EMAIL_QUEUE === 'true';
    if (useEmailQueue) {
      try {
        await EmailWorker.start();
      } catch (error) {
        console.error('❌ Failed to start email worker (RabbitMQ may not be available):', error);
        console.log('⚠️  Continuing without email queue - emails will be sent directly');
      }
    } else {
      console.log('ℹ️  Email queue disabled (USE_EMAIL_QUEUE=false)');
    }

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await AppDataSource.destroy();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      await AppDataSource.destroy();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Worker'ı başlat
startWorker();


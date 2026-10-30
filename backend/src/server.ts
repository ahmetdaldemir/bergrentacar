import { createServer } from 'http';
import { createApp } from './app';
import { AppDataSource } from './config/data-source';
import { loadEnv } from './config/env';
import { ensureTenantSettingsApiKeyColumns } from './config/ensure-tenant-settings-columns';
import { startCurrencyScheduler } from './services/currency-scheduler.service';
import { startFinanceReminderScheduler } from './services/finance-reminder-scheduler.service';
import { startDatabaseBackupScheduler } from './services/database-backup.service';
import { startActivityLogCleanupScheduler } from './services/activity-log-cleanup.service';
import { ChatSocketServer } from './modules/chat/websocket/chat-socket.server';
import { initTenantPanelSocket } from './services/tenant-panel-socket.service';
import { logger } from './utils/logger';
import { getRedisClient } from './config/redis.config';
// Initialize vehicle tracking providers
import './modules/rentacar/services/vehicle-tracking.service';
// Register invoice integrators
import { IntegratorRegistry } from './modules/shared/services/invoice/integrator-registry';
import { MockIntegrator } from './modules/shared/services/invoice/mock-integrator';
// Register reservation type handlers (strategy pattern)
import { registerRentacarReservationHandler } from './modules/rentacar/services/rentacar-reservation-handler';
// Modüler Monolit - Event Handlers
import { registerAllEventHandlers } from './core/event-handlers';
import { assertBergrentacarDomainExists, assertInstallationAllowed, startBergrentacarDomainWatch } from './security/bergrentacar-site';

const start = async () => {
  assertInstallationAllowed();
  await assertBergrentacarDomainExists();
  startBergrentacarDomainWatch();
  const config = loadEnv();

  // Initialize database connection
  await AppDataSource.initialize();
  logger.info('Database connection initialized');

  // DB_SYNC=false ortamlarında bile API key kolonları oluşsun (TypeORM sync kolon eklemez)
  await ensureTenantSettingsApiKeyColumns(AppDataSource);

  // Register invoice integrators
  IntegratorRegistry.register(new MockIntegrator());
  logger.info('Invoice integrators registered');

  // Register reservation type handlers (strategy/registry pattern)
  registerRentacarReservationHandler();
  logger.info('Reservation type handlers registered');

  // Initialize Redis connection
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.connect();
      // Test connection with a simple command
      await redis.ping();
      logger.info('Redis connection initialized');
    } else {
      logger.info('Redis disabled, continuing without cache');
    }
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    // Continue without Redis - cache operations will gracefully fail
  }

  // Migrations disabled — şema genelde TypeORM synchronize ile (env: DB_SYNC, varsayılan true).
  // Production’da kolon kaybını önlemek için DB_SYNC=false + manuel SQL önerilir.
  // if (config.nodeEnv === 'production' && !AppDataSource.options.synchronize) {
  //   // Migration code removed - using synchronize instead
  // }

  const app = createApp();
  const port = config.app.port;

  // Create HTTP server WITHOUT Express app first
  // We'll attach Express app after Socket.io to ensure Socket.io handles its paths first
  const httpServer = createServer();

  // Initialize WebSocket server for chat FIRST (before Express)
  // Socket.io attaches its own request handler to the HTTP server
  // IMPORTANT: Socket.io's handler MUST run BEFORE Express app's handler
  const chatSocketServer = new ChatSocketServer(httpServer);
  initTenantPanelSocket(chatSocketServer.getIO());

  // Now attach Express app - Socket.io will handle /socket.io/ paths before Express sees them
  httpServer.on('request', (req, res) => {
    // If it's a Socket.io request, let Socket.io handle it (should already be handled)
    if (req.url?.startsWith('/socket.io/')) {
      // Socket.io should have already handled this, but if not, don't pass to Express
      logger.warn('[SERVER] Socket.io request reached Express handler (unexpected)', {
        method: req.method,
        url: req.url,
      });
      return;
    }
    // Pass all other requests to Express app
    app(req, res);
  });
  
  logger.info('HTTP server and Socket.io initialized (Socket.io before Express)');

  // Register Event Handlers (Modüler Monolit)
  registerAllEventHandlers();
  logger.info('Event handlers registered');

  // Start AI job worker if Redis available
  try {
    const { AiJobQueueService } = await import('./modules/shared/services/ai-job-queue.service');
    AiJobQueueService.startWorker();
    logger.info('AI job worker started');
  } catch (error: any) {
    logger.warn('Failed to start AI job worker', { error: error instanceof Error ? error.message : String(error) });
  }

  // Schedulers'ı başlat (production ve development'da)
  // Development'da da backup çalışır ama sadece production'da cron aktif
  if (config.nodeEnv === 'production') {
    startCurrencyScheduler();
    startFinanceReminderScheduler();
    startDatabaseBackupScheduler(); // Daily at 00:10
    startActivityLogCleanupScheduler();
  } else {
    // Development'da da backup scheduler'ı başlat (test için)
    startDatabaseBackupScheduler();
    logger.info('Development mode: Backup scheduler started (cron: 00:10 daily)');
  }

  // Listen on all network interfaces (0.0.0.0) to allow connections from emulators and other devices
  // localhost only listens on 127.0.0.1, which doesn't work for Android emulator (10.0.2.2)
  httpServer.listen(port, '0.0.0.0', () => {
    logger.info(`API running on port ${port} (0.0.0.0:${port})`, { environment: config.nodeEnv });
    logger.info(`Accessible from: localhost:${port}, 127.0.0.1:${port}, and network IPs`);
  });
};

start().catch((error) => {
  console.error('❌ Failed to start API', error);
  process.exit(1);
});

import 'reflect-metadata';
import express, { Express } from 'express';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import path from 'path';
import fs from 'fs';
import { registerRoutes } from './routes';
import { requestLogger } from './middleware/request-logger.middleware';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { tenantMiddleware } from './middleware/tenant.middleware';
import { activityLogMiddleware } from './middleware/activity-log.middleware';
import { errorLogMiddleware } from './middleware/error-log.middleware';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';
import { logger } from './utils/logger';
import { corsOriginCallback } from './config/cors-origins';
import { siteLockMiddleware } from './security/site-lock.middleware';
import { getUploadsDir } from './config/uploads-path';

export const createApp = (): Express => {
  // Note: For WebSocket support, use createHttpServer() in server.ts
  const app = express();

  app.use(siteLockMiddleware);

  // CORS — yalnızca bergrentacar.com
  app.use(
    cors({
      origin: corsOriginCallback,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'x-tenant-id',
        'X-Tenant-Id',
      ],
      exposedHeaders: ['Content-Length', 'Content-Type'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    })
  );
  
  // Increase body parser limits for file uploads
  // Cloudflare free plan has 100MB limit, so we set 50MB to be safe
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Request ID middleware (must be first for tracing)
  app.use(requestIdMiddleware);

  // Request logging middleware (should be early in the chain)
  // Skip Socket.io requests (they're logged by Socket.io itself)
  app.use((req, res, next) => {
    if (req.path.startsWith('/socket.io/')) {
      return next(); // Skip request logger for Socket.io
    }
    requestLogger(req, res, next);
  });

  // Public klasörünü static olarak serve et (uploads için)
  // Production'da: /app/dist/app.js -> /app/public
  // Development'ta: src/app.ts -> public
  let publicDir: string;
  if (__dirname.includes('dist')) {
    // Production: dist/app.js -> ../public (Dockerfile'da public klasörü /app/public'e kopyalanır)
    publicDir = path.join(__dirname, '../public');
    logger.info(`[APP] Production mode - __dirname: ${__dirname}, publicDir: ${publicDir}`);
  } else {
    // Development: src/app.ts -> ../public
    publicDir = path.join(__dirname, '../public');
    logger.info(`[APP] Development mode - __dirname: ${__dirname}, publicDir: ${publicDir}`);
  }
  
  const uploadsDir = getUploadsDir();
  logger.info(`[APP] Uploads directory: ${uploadsDir}`);
  
  // Serve uploads directory as static files (BEFORE tenantMiddleware - public access)
  // IMPORTANT: This must be BEFORE tenantMiddleware to avoid authentication checks
  app.use('/uploads', (req, res, next) => {
    // Log upload requests for debugging
    const requestedFile = path.join(uploadsDir, req.path.replace(/^\/uploads\//, ''));
    logger.info(`[UPLOADS] Request for: ${req.path} -> File path: ${requestedFile}`);
    logger.info(`[UPLOADS] Directory exists: ${fs.existsSync(uploadsDir)}, File exists: ${fs.existsSync(requestedFile)}`);
    next();
  });
  
  app.use('/uploads', express.static(uploadsDir, {
    index: false, // Don't serve directory listings
    fallthrough: true, // Allow fall through if file not found
    dotfiles: 'ignore', // Ignore dotfiles
    setHeaders: (res, filePath) => {
      // Set proper headers for images
      const ext = path.extname(filePath).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    },
  }));
  
  // Custom handler for /uploads if static file not found
  app.use('/uploads', (req, res, next) => {
    const requestedFile = path.join(uploadsDir, req.path.replace(/^\/uploads\//, ''));
    if (!fs.existsSync(requestedFile)) {
      logger.warn(`[UPLOADS] File not found: ${requestedFile}`);
      logger.warn(`[UPLOADS] Uploads directory: ${uploadsDir}`);
      logger.warn(`[UPLOADS] Directory contents: ${fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).join(', ') : 'DOES NOT EXIST'}`);
      return res.status(404).json({ 
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `File not found: ${req.path}`,
          details: {
            requestedPath: req.path,
            filePath: requestedFile,
            uploadsDir: uploadsDir,
            directoryExists: fs.existsSync(uploadsDir),
            fileExists: fs.existsSync(requestedFile),
          }
        }
      });
    }
    next();
  });
  
  logger.info(`Serving static files from: ${uploadsDir}`);

  // Serve widget.js from public directory (BEFORE tenantMiddleware - no tenant required)
  app.get('/widget.js', (req, res) => {
    const widgetPath = path.join(publicDir, 'widget.js');
    if (fs.existsSync(widgetPath)) {
      res.type('application/javascript');
      res.sendFile(widgetPath);
    } else {
      logger.error(`Widget file not found at: ${widgetPath}`);
      res.status(404).json({ error: 'Widget file not found' });
    }
  });

  // IMPORTANT: Socket.io requests are handled at HTTP server level, before Express
  // This middleware should NEVER be reached for Socket.io requests
  // If we reach here, it's a critical error - Socket.io handler failed
  app.use((req, res, next) => {
    if (req.path.startsWith('/socket.io/')) {
      logger.error('[APP] CRITICAL: Socket.io request reached Express (Socket.io handler failed!)', { 
        path: req.path, 
        method: req.method,
        url: req.url,
      });
      // Return 503 Service Unavailable - Socket.io service is not working
      return res.status(503).json({ 
        error: 'Socket.io service unavailable',
        message: 'WebSocket server is not responding. Please contact support.',
      });
    }
    next();
  });

  // Tenant resolution middleware (extracts tenant from Host header)
  // Must be AFTER public routes like /widget.js and Socket.io skip
  app.use(tenantMiddleware);

  // Activity log middleware (logs selected routes automatically)
  app.use(activityLogMiddleware);

  // Register all routes
  registerRoutes(app);

  // 404 handler (must be after all routes)
  app.use(notFoundHandler);

  // Error log middleware (logs unhandled errors)
  app.use(errorLogMiddleware);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

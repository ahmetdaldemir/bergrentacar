import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoring.controller';
import { EmailTestController } from '../controllers/email-test.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

// Tüm route'lar authentication gerektirir
router.get('/services', authenticate, MonitoringController.getServicesStatus);
router.get('/services/:serviceName/logs', authenticate, MonitoringController.getServiceLogs);
router.get('/stats', authenticate, MonitoringController.getSystemStats);
router.post('/services/:serviceName/start', authenticate, MonitoringController.startService);
router.post('/services/:serviceName/stop', authenticate, MonitoringController.stopService);
router.post('/services/:serviceName/restart', authenticate, MonitoringController.restartService);

// Email test endpoint
router.post('/test-email', authenticate, EmailTestController.sendTestEmail);

export default router;


import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

// Admin authenticated routes
router.get('/', authenticate, BackupController.list);
router.post('/create', authenticate, BackupController.create);
router.delete('/:id', authenticate, BackupController.delete);

// Public download route (uses base64 encoded ID for security)
router.get('/download/:id', BackupController.download);

export default router;

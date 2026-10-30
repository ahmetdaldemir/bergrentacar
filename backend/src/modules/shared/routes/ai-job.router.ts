import { Router } from 'express';
import { AiJobController } from '../controllers/ai-job.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';

const router = Router();

// Public endpoints require authentication
router.use(authenticate);

router.post('/jobs', AiJobController.enqueue);
router.get('/jobs/:id', AiJobController.getJobStatus);

export default router;


import { Request, Response } from 'express';
import { AiJobQueueService } from '../services/ai-job-queue.service';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError } from '../../../utils/errors';

export class AiJobController {
  static enqueue = asyncHandler(async (req: Request, res: Response) => {
    const { type, title, languageCode, tone } = req.body;
    const tenantId = (req as any).auth?.tenantId || (req as any).tenant?.id;
    if (!type || !title) throw new ValidationError('type and title are required');
    const id = await AiJobQueueService.enqueue({ type, title, tenantId, languageCode, tone });
    sendSuccess(res, { jobId: id, message: 'Job enqueued' }, 202);
  });

  static getJobStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const redis = (await import('../../../config/redis.config')).getRedisClient();
    if (!redis) throw new ValidationError('Redis not available');
    const raw = await redis.hget(`ai_job:${id}`, 'data');
    if (!raw) throw new NotFoundError('Job', id);
    const job = JSON.parse(raw);
    sendSuccess(res, job);
  });
}


import { v4 as uuidv4 } from 'uuid';
import { getRedisBlockingClient, getRedisClient } from '../../../config/redis.config';
import { AiContentService } from './ai-content.service';
import { BlogAiService } from './blog-ai.service';
import { logger } from '../../../utils/logger';

type AiJobPayload = {
  type: 'destination' | 'blog';
  title: string;
  tenantId?: string;
  languageCode?: string;
  tone?: string;
  extra?: Record<string, any>;
};

const QUEUE_KEY = 'ai_jobs_queue';

export class AiJobQueueService {
  static async enqueue(payload: AiJobPayload) {
    const redis = getRedisClient();
    const id = uuidv4();
    const jobKey = `ai_job:${id}`;
    const now = Date.now();
    const job = {
      id,
      payload,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    if (redis) {
      await redis.hset(jobKey, 'data', JSON.stringify(job));
      // set TTL for job record (7 days)
      await redis.expire(jobKey, 60 * 60 * 24 * 7);
      // push job id to list
      await redis.lpush(QUEUE_KEY, id);
    } else {
      // Fallback: process immediately (no queue)
      setImmediate(() => {
        this.processJobObject(job).catch(e => logger.error('Immediate job failed', e));
      });
    }
    return id;
  }

  static async processJobId(id: string) {
    const redis = getRedisClient();
    if (!redis) return;
    const jobKey = `ai_job:${id}`;
    const raw = await redis.hget(jobKey, 'data');
    if (!raw) return;
    let job: any;
    try {
      job = JSON.parse(raw);
    } catch {
      return;
    }
    await this.processJobObject(job);
  }

  private static async processJobObject(job: any) {
    const redis = getRedisClient();
    const jobKey = `ai_job:${job.id}`;
    try {
      // mark running
      if (redis) {
        job.status = 'running';
        job.updatedAt = Date.now();
        await redis.hset(jobKey, 'data', JSON.stringify(job));
      }

      const p: AiJobPayload = job.payload;
      let result: any = null;
      if (p.type === 'destination') {
        result = await AiContentService.generateDestinationContent({ title: p.title }, p.tenantId, p.languageCode);
      } else if (p.type === 'blog') {
        result = await BlogAiService.generateBlogContent({
          title: p.title,
          tone: (p.tone as any) || 'kurumsal',
          regenerate: false,
          tenantId: p.tenantId || '',
          sourceLanguageCode: p.languageCode,
        } as any);
      }

      job.status = 'done';
      job.result = result;
      job.updatedAt = Date.now();
      if (redis) {
        await redis.hset(jobKey, 'data', JSON.stringify(job));
        // Keep result for 7 days
        await redis.expire(jobKey, 60 * 60 * 24 * 7);
      }
    } catch (error: any) {
      logger.error('AI job processing failed', { error: error instanceof Error ? error.message : String(error) });
      job.status = 'failed';
      job.error = String(error?.message || error);
      job.updatedAt = Date.now();
      if (redis) {
        await redis.hset(jobKey, 'data', JSON.stringify(job));
        await redis.expire(jobKey, 60 * 60 * 24 * 7);
      }
    }
  }

  static async startWorker(stopSignal?: () => boolean) {
    const redisBlocking = getRedisBlockingClient();
    if (!redisBlocking) {
      logger.info('Redis not available — AI job worker disabled');
      return;
    }
    logger.info('AI job worker starting (listening on Redis queue)');
    // BRPOP uzun bloklar; ana Redis client commandTimeout 500ms — getRedisBlockingClient kullan
    (async function loop() {
      while (!stopSignal || !stopSignal()) {
        try {
          const res = await redisBlocking.brpop(QUEUE_KEY, 30);
          if (!res) continue;
          const id = res[1];
          await AiJobQueueService.processJobId(id);
        } catch (err: any) {
          logger.error('AI job worker error', { error: err instanceof Error ? err.message : String(err) });
          // small delay on error
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    })();
  }
}


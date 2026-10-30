import { loadEnv } from './env';

const env = loadEnv();

export const queueConfig = {
  url:
    process.env.RABBITMQ_URL ||
    `amqp://${process.env.RABBITMQ_USER || ''}:${process.env.RABBITMQ_PASSWORD || ''}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || 5672}${process.env.RABBITMQ_VHOST ? `/${process.env.RABBITMQ_VHOST}` : ''}`,
  queues: {
    email: 'email_queue',
    emailHighPriority: 'email_queue_high_priority',
  },
  exchange: {
    email: 'email_exchange',
  },
};


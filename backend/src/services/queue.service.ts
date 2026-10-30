import * as amqp from 'amqplib';
import { queueConfig } from '../config/queue.config';

export class QueueService {
  private static connection: amqp.ChannelModel | null = null;
  private static channel: amqp.Channel | null = null;

  /**
   * RabbitMQ bağlantısını başlat
   */
  static async connect(): Promise<void> {
    if (this.connection) {
      return; // Zaten bağlı
    }

    try {
      this.connection = await amqp.connect(queueConfig.url);
      this.channel = await this.connection.createChannel();

      if (!this.channel) {
        throw new Error('Failed to create channel');
      }

      // Exchange oluştur
      await this.channel.assertExchange(queueConfig.exchange.email, 'direct', {
        durable: true,
      });

      // Queue'ları oluştur
      await this.channel.assertQueue(queueConfig.queues.email, {
        durable: true,
      });
      await this.channel.assertQueue(queueConfig.queues.emailHighPriority, {
        durable: true,
      });

      // Queue'ları exchange'e bağla
      await this.channel.bindQueue(
        queueConfig.queues.email,
        queueConfig.exchange.email,
        'normal'
      );
      await this.channel.bindQueue(
        queueConfig.queues.emailHighPriority,
        queueConfig.exchange.email,
        'high'
      );

      console.log('✅ RabbitMQ connected and queues initialized');

      // Bağlantı kapanırsa yeniden bağlan
      if (this.connection && this.connection.connection) {
        this.connection.connection.on('close', () => {
          console.log('⚠️ RabbitMQ connection closed, reconnecting...');
          this.connection = null;
          this.channel = null;
          setTimeout(() => this.connect(), 5000);
        });
      }
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Mesajı kuyruğa ekle
   */
  static async publishEmailJob(
    job: EmailJob,
    priority: 'normal' | 'high' = 'normal'
  ): Promise<boolean> {
    if (!this.channel) {
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ Failed to connect to RabbitMQ for publishing:', error);
        throw error; // Hata fırlat ki fallback çalışsın
      }
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const queue =
      priority === 'high'
        ? queueConfig.queues.emailHighPriority
        : queueConfig.queues.email;

    const routingKey = priority === 'high' ? 'high' : 'normal';

    const published = this.channel.publish(
      queueConfig.exchange.email,
      routingKey,
      Buffer.from(JSON.stringify(job)),
      {
        persistent: true,
        priority: priority === 'high' ? 10 : 0,
      }
    );

    if (!published) {
      // Buffer dolu olabilir, biraz bekle ve tekrar dene
      await new Promise(resolve => setTimeout(resolve, 100));
      const retryPublished = this.channel.publish(
        queueConfig.exchange.email,
        routingKey,
        Buffer.from(JSON.stringify(job)),
        {
          persistent: true,
          priority: priority === 'high' ? 10 : 0,
        }
      );
      
      if (!retryPublished) {
        throw new Error('Failed to publish email job to RabbitMQ queue (buffer full or connection issue)');
      }
    }

    return true;
  }

  /**
   * Email job'u consume et
   */
  static async consumeEmailJobs(
    handler: (job: EmailJob) => Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    // Normal priority queue
    await this.channel.consume(
      queueConfig.queues.email,
      async (msg) => {
        if (!msg) return;

        try {
          const job: EmailJob = JSON.parse(msg.content.toString());
          await handler(job);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing email job:', error);
          // Hata durumunda mesajı tekrar kuyruğa ekle (nack with requeue)
          this.channel!.nack(msg, false, true);
        }
      },
      { noAck: false }
    );

    // High priority queue
    await this.channel.consume(
      queueConfig.queues.emailHighPriority,
      async (msg) => {
        if (!msg) return;

        try {
          const job: EmailJob = JSON.parse(msg.content.toString());
          await handler(job);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing high priority email job:', error);
          this.channel!.nack(msg, false, true);
        }
      },
      { noAck: false }
    );

    console.log('✅ Email job consumers started');
  }

  /**
   * Bağlantıyı kapat
   */
  static async close(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.close();
      } catch (error) {
        console.error('Error closing channel:', error);
      }
      this.channel = null;
    }
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
      this.connection = null;
    }
  }
}

export type EmailJobType =
  | 'customer_welcome'
  | 'reservation_confirmation'
  | 'reservation_cancelled'
  | 'reservation_completed'
  | 'vehicle_pickup'
  | 'survey_invitation'
  | 'password_reset';

export interface EmailJob {
  type: EmailJobType;
  tenantId: string;
  data: {
    customerId?: string;
    reservationId?: string;
    email: string;
    languageId?: string;
    [key: string]: any;
  };
  priority?: 'normal' | 'high';
  retries?: number;
}


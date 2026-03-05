/**
 * Message Queue Service using Bull
 * Handles async job processing
 */

import Bull from 'bull';
import envConfig from '../config/validation';
import logger from '../utils/logger';

// Define job types
export interface SendMessageJob {
  instanceId: number;
  phoneNumber: string;
  message: string;
  retryCount?: number;
}

export interface SyncGroupsJob {
  instanceId: number;
  retryCount?: number;
}

export interface DispatchCampaignJob {
  campaignId: number;
  instanceId: number;
  phoneNumbers: string[];
  message: string;
  delayMs?: number;
}

export interface ReconnectInstanceJob {
  instanceId: number;
  retryCount?: number;
}

export interface CleanupJob {
  type: 'sessions' | 'logs' | 'temp-files';
}

class QueueService {
  private messageQueue: Bull.Queue<SendMessageJob> | null = null;
  private groupSyncQueue: Bull.Queue<SyncGroupsJob> | null = null;
  private campaignQueue: Bull.Queue<DispatchCampaignJob> | null = null;
  private reconnectQueue: Bull.Queue<ReconnectInstanceJob> | null = null;
  private cleanupQueue: Bull.Queue<CleanupJob> | null = null;
  private isRedisAvailable: boolean = false;

  constructor() {
    // Only initialize queues if Redis is configured
    if (envConfig.redisHost && envConfig.redisHost.trim()) {
      try {
        const queueConfig = {
          redis: {
            host: envConfig.redisHost,
            port: envConfig.redisPort,
            password: envConfig.redisPassword,
            db: envConfig.redisDB,
          },
        };

        this.messageQueue = new Bull<SendMessageJob>('send-message', queueConfig);
        this.groupSyncQueue = new Bull<SyncGroupsJob>('sync-groups', queueConfig);
        this.campaignQueue = new Bull<DispatchCampaignJob>('dispatch-campaign', queueConfig);
        this.reconnectQueue = new Bull<ReconnectInstanceJob>('reconnect-instance', queueConfig);
        this.cleanupQueue = new Bull<CleanupJob>('cleanup', queueConfig);
        this.isRedisAvailable = true;

        this.setupEventListeners();
      } catch (err) {
        logger.warn('⚠️  Failed to initialize Bull queues, running without Redis queue support:', err instanceof Error ? err.message : String(err));
        this.isRedisAvailable = false;
      }
    } else {
      logger.info('ℹ️  Redis not configured, queue service will be disabled (Redis host is empty)');
      this.isRedisAvailable = false;
    }
  }

  /**
   * Initialize queue service (verify connection)
   */
  async init(): Promise<boolean> {
    // If Redis is not available, skip queue initialization
    if (!this.isRedisAvailable || !this.messageQueue) {
      logger.info('ℹ️  Queue service skipped (Redis not available)');
      return false;
    }

    try {
      // Test connection to all queues by checking their status
      const queueStatus = {
        messageQueue: await this.messageQueue!.count(),
        groupSyncQueue: await this.groupSyncQueue!.count(),
        campaignQueue: await this.campaignQueue!.count(),
        reconnectQueue: await this.reconnectQueue!.count(),
        cleanupQueue: await this.cleanupQueue!.count(),
      };
      
      logger.info(`📊 Queue service initialized with ${Object.values(queueStatus).reduce((a, b) => a + b, 0)} pending jobs`);
      return true;
    } catch (error) {
      logger.warn('⚠️  Queue service initialization failed (Redis not available), continuing with degraded queue:', error instanceof Error ? error.message : String(error));
      // Return true to allow server to continue - queues will work in memory if available
      return false;
    }
  }

  /**
   * Setup event listeners for all queues
   */
  private setupEventListeners() {
    // Skip if no queues available
    if (!this.isRedisAvailable) return;

    // Message Queue Events
    if (this.messageQueue) {
      this.messageQueue.on('completed', (job) => {
        logger.info(`✅ Message sent: ${job.id}`);
      });

      this.messageQueue.on('failed', (job, err) => {
        logger.error(`❌ Message failed: ${job.id}`, err.message);
      });

      this.messageQueue.on('error', (err) => {
        logger.error('❌ Message queue error:', err);
      });
    }

    // Group Sync Queue Events
    if (this.groupSyncQueue) {
      this.groupSyncQueue.on('completed', (job) => {
        logger.info(`✅ Groups synced: ${job.id}`);
      });

      this.groupSyncQueue.on('failed', (job, err) => {
        logger.error(`❌ Group sync failed: ${job.id}`, err.message);
      });
    }

    // Campaign Queue Events
    if (this.campaignQueue) {
      this.campaignQueue.on('completed', (job) => {
        logger.info(`✅ Campaign dispatched: ${job.id}`);
      });

      this.campaignQueue.on('failed', (job, err) => {
        logger.error(`❌ Campaign dispatch failed: ${job.id}`, err.message);
      });
    }

    // Reconnect Queue Events
    if (this.reconnectQueue) {
      this.reconnectQueue.on('completed', (job) => {
        logger.info(`✅ Instance reconnected: ${job.id}`);
      });

      this.reconnectQueue.on('failed', (job, err) => {
        logger.error(`❌ Instance reconnection failed: ${job.id}`, err.message);
      });
    }

    logger.info('✅ Queue event listeners configured');
  }

  /**
   * Add a message to the send queue
   */
  async addSendMessage(
    instanceId: number,
    phoneNumber: string,
    message: string,
    delay = 0
  ): Promise<Bull.Job<SendMessageJob> | null> {
    if (!this.messageQueue) {
      logger.warn('⚠️  Queue service unavailable, message will not be queued');
      return null;
    }

    return this.messageQueue.add(
      {
        instanceId,
        phoneNumber,
        message,
        retryCount: 0,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
        delay,
      }
    );
  }

  /**
   * Add group sync job
   */
  async addGroupSync(instanceId: number): Promise<Bull.Job<SyncGroupsJob> | null> {
    if (!this.groupSyncQueue) {
      logger.warn('⚠️  Queue service unavailable, group sync will not be queued');
      return null;
    }

    return this.groupSyncQueue.add(
      {
        instanceId,
        retryCount: 0,
      },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
      }
    );
  }

  /**
   * Add campaign dispatch job
   */
  async addCampaignDispatch(
    campaignId: number,
    instanceId: number,
    phoneNumbers: string[],
    message: string,
    delayMs = 1000
  ): Promise<Bull.Job<DispatchCampaignJob> | null> {
    if (!this.campaignQueue) {
      logger.warn('⚠️  Queue service unavailable, campaign will not be queued');
      return null;
    }

    return this.campaignQueue.add(
      {
        campaignId,
        instanceId,
        phoneNumbers,
        message,
        delayMs,
      },
      {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  }

  /**
   * Add instance reconnection job
   */
  async addReconnectInstance(instanceId: number): Promise<Bull.Job<ReconnectInstanceJob> | null> {
    if (!this.reconnectQueue) {
      logger.warn('⚠️  Queue service unavailable, reconnect will not be queued');
      return null;
    }

    return this.reconnectQueue.add(
      {
        instanceId,
        retryCount: 0,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      }
    );
  }

  /**
   * Add cleanup job
   */
  async addCleanupJob(options?: { type?: 'sessions' | 'logs' | 'temp-files', daysOld?: number }): Promise<Bull.Job<CleanupJob> | null> {
    if (!this.cleanupQueue) {
      logger.warn('⚠️  Queue service unavailable, cleanup will not be queued');
      return null;
    }

    const type = options?.type || 'temp-files';
    return this.cleanupQueue.add(
      { type },
      {
        attempts: 1,
        removeOnComplete: true,
      }
    );
  }

  /**
   * Process send message queue
   */
  processSendMessage(processor: (job: Bull.Job<SendMessageJob>) => Promise<any>) {
    if (!this.messageQueue) {
      logger.warn('⚠️  Cannot process message queue, service unavailable');
      return;
    }
    this.messageQueue.process(8, processor); // 8 concurrent messages
  }

  /**
   * Process group sync queue
   */
  processGroupSync(processor: (job: Bull.Job<SyncGroupsJob>) => Promise<any>) {
    if (!this.groupSyncQueue) {
      logger.warn('⚠️  Cannot process group sync queue, service unavailable');
      return;
    }
    this.groupSyncQueue.process(2, processor); // 2 concurrent syncs
  }

  /**
   * Process campaign queue
   */
  processCampaignDispatch(processor: (job: Bull.Job<DispatchCampaignJob>) => Promise<any>) {
    if (!this.campaignQueue) {
      logger.warn('⚠️  Cannot process campaign queue, service unavailable');
      return;
    }
    this.campaignQueue.process(1, processor); // 1 at a time (serial)
  }

  /**
   * Process reconnect queue
   */
  processReconnectInstance(processor: (job: Bull.Job<ReconnectInstanceJob>) => Promise<any>) {
    if (!this.reconnectQueue) {
      logger.warn('⚠️  Cannot process reconnect queue, service unavailable');
      return;
    }
    this.reconnectQueue.process(4, processor); // 4 concurrent reconnects
  }

  /**
   * Process cleanup queue
   */
  processCleanup(processor: (job: Bull.Job<CleanupJob>) => Promise<any>) {
    if (!this.cleanupQueue) {
      logger.warn('⚠️  Cannot process cleanup queue, service unavailable');
      return;
    }
    this.cleanupQueue.process(processor);
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    if (!this.isRedisAvailable) {
      return {
        message: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        groupSync: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        campaign: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        reconnect: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        cleanup: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      };
    }

    const [messageCounts, groupSyncCounts, campaignCounts, reconnectCounts, cleanupCounts] =
      await Promise.all([
        this.messageQueue?.getJobCounts() ?? Promise.resolve({}),
        this.groupSyncQueue?.getJobCounts() ?? Promise.resolve({}),
        this.campaignQueue?.getJobCounts() ?? Promise.resolve({}),
        this.reconnectQueue?.getJobCounts() ?? Promise.resolve({}),
        this.cleanupQueue?.getJobCounts() ?? Promise.resolve({}),
      ]);

    return {
      message: messageCounts,
      groupSync: groupSyncCounts,
      campaign: campaignCounts,
      reconnect: reconnectCounts,
      cleanup: cleanupCounts,
    };
  }

  /**
   * Clear all queues
   */
  async clearAll() {
    if (!this.isRedisAvailable) {
      logger.warn('⚠️  Queue service unavailable, skipping clear');
      return;
    }

    await Promise.all([
      this.messageQueue?.empty() ?? Promise.resolve(),
      this.groupSyncQueue?.empty() ?? Promise.resolve(),
      this.campaignQueue?.empty() ?? Promise.resolve(),
      this.reconnectQueue?.empty() ?? Promise.resolve(),
      this.cleanupQueue?.empty() ?? Promise.resolve(),
    ]);

    logger.warn('⚠️  All queues cleared');
  }

  /**
   * Close all queues
   */
  async close() {
    if (!this.isRedisAvailable) {
      logger.warn('⚠️  Queue service was not running');
      return;
    }

    await Promise.all([
      this.messageQueue?.close() ?? Promise.resolve(),
      this.groupSyncQueue?.close() ?? Promise.resolve(),
      this.campaignQueue?.close() ?? Promise.resolve(),
      this.reconnectQueue?.close() ?? Promise.resolve(),
      this.cleanupQueue?.close() ?? Promise.resolve(),
    ]);

    logger.info('✅ All queues closed');
  }
}

export default new QueueService();

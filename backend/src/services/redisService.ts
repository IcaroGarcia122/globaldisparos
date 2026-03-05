/**
 * Redis Cache Service
 * Handles caching operations and session storage
 */

import Redis from 'ioredis';
import envConfig from '../config/validation';
import logger from '../utils/logger';

class RedisService {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    // ⚠️  TEMPORÁRIO: Skip Redis init se host está vazio (Docker não rodando)
    if (!envConfig.redisHost?.trim()) {
      logger.warn('⚠️  Redis disabled (REDIS_HOST not configured)');
      return;
    }

    this.client = new Redis({
      host: envConfig.redisHost,
      port: envConfig.redisPort,
      password: envConfig.redisPassword,
      db: envConfig.redisDB,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    this.setupListeners();
  }

  /**
   * Setup event listeners
   */
  private setupListeners() {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('✅ Redis connected');
    });

    this.client.on('error', (err) => {
      logger.error('❌ Redis error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('⚠️  Redis disconnected');
      this.isConnected = false;
    });

    this.client.on('ready', () => {
      logger.info('✅ Redis ready');
    });
  }

  /**
   * Check if Redis is connected
   */
  public isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Ping Redis to verify connection
   */
  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<any> {
    if (!this.client) return null;
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMultiple(keys: string[]): Promise<boolean> {
    if (keys.length === 0) return true;
    if (!this.client) return true;

    try {
      await this.client.del(...keys);
      return true;
    } catch (error) {
      logger.error(`Error deleting multiple keys:`, error);
      return false;
    }
  }

  /**
   * Clear all keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      return await this.client.del(...keys);
    } catch (error) {
      logger.error(`Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Error checking key existence ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment numeric value
   */
  async increment(key: string, amount = 1): Promise<number> {
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      logger.error(`Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decrement numeric value
   */
  async decrement(key: string, amount = 1): Promise<number> {
    try {
      return await this.client.decrby(key, amount);
    } catch (error) {
      logger.error(`Error decrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result > 0;
    } catch (error) {
      logger.error(`Error setting expiration on ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL of key
   */
  async getTTL(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Error getting TTL for ${key}:`, error);
      return -1;
    }
  }

  /**
   * Clear all cache
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.client.flushall();
      logger.warn('⚠️  Redis cache cleared');
      return true;
    } catch (error) {
      logger.error('Error flushing Redis:', error);
      return false;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<any> {
    try {
      return await this.client.info();
    } catch (error) {
      logger.error('Error getting Redis info:', error);
      return null;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('✅ Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }
  }

  /**
   * Cache key generators
   */
  static cacheKeys = {
    user: (userId: number) => `user:${userId}`,
    instance: (instanceId: number) => `instance:${instanceId}`,
    campaign: (campaignId: number) => `campaign:${campaignId}`,
    groups: (instanceId: number) => `groups:${instanceId}`,
    contacts: (userId: number) => `contacts:${userId}`,
    session: (sessionId: string) => `session:${sessionId}`,
    connection: (instanceId: number) => `connection:${instanceId}`,
    qrCode: (instanceId: number) => `qr:${instanceId}`,
  };
}

export default new RedisService();

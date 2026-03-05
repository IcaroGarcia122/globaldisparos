/**
 * Audit Log Service
 * Tracks and logs all user actions for compliance
 */

import { ActivityLog } from '../models';
import logger from '../utils/logger';

export enum AuditAction {
  // User actions
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',

  // Instance actions
  INSTANCE_CREATED = 'instance_created',
  INSTANCE_CONNECTED = 'instance_connected',
  INSTANCE_DISCONNECTED = 'instance_disconnected',
  INSTANCE_DELETED = 'instance_deleted',
  INSTANCE_QR_SCANNED = 'instance_qr_scanned',

  // Campaign actions
  CAMPAIGN_CREATED = 'campaign_created',
  CAMPAIGN_STARTED = 'campaign_started',
  CAMPAIGN_PAUSED = 'campaign_paused',
  CAMPAIGN_COMPLETED = 'campaign_completed',
  CAMPAIGN_FAILED = 'campaign_failed',
  CAMPAIGN_DELETED = 'campaign_deleted',

  // Message actions
  MESSAGE_SENT = 'message_sent',
  MESSAGE_FAILED = 'message_failed',
  BULK_MESSAGE_STARTED = 'bulk_message_started',

  // Contact actions
  CONTACT_CREATED = 'contact_created',
  CONTACT_LIST_CREATED = 'contact_list_created',
  CONTACT_LIST_DELETED = 'contact_list_deleted',

  // Group actions
  GROUP_CREATED = 'group_created',
  GROUP_MEMBER_ADDED = 'group_member_added',
  GROUP_MEMBER_REMOVED = 'group_member_removed',
  GROUP_MESSAGE_SENT = 'group_message_sent',

  // Security actions
  FAILED_LOGIN_ATTEMPT = 'failed_login_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKED = 'account_locked',

  // Admin actions
  ADMIN_LOGIN = 'admin_login',
  ADMIN_ACTION = 'admin_action',
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',
  DAILY_RESET = 'daily_reset',
}

export interface AuditLogInput {
  userId: number;
  action: AuditAction;
  resourceType?: string;
  resourceId?: number | string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  level?: 'info' | 'warn' | 'error';
}

class AuditService {
  /**
   * Log an action
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      const logLevel = input.level || this.getLogLevel(input.action);
      // Map 'warn' to 'warning' for ActivityLog model
      const dbLogLevel = logLevel === 'warn' ? 'warning' : logLevel;

      await ActivityLog.create({
        userId: input.userId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        details: input.details || {},
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        level: dbLogLevel as any,
      });

      // Also log to application logger
      const logMessage = `🔏 [${input.action}] User ${input.userId}`;
      if (logLevel === 'error') {
        logger.error(logMessage, input.details);
      } else if (logLevel === 'warn') {
        logger.warn(logMessage);
      } else {
        logger.info(logMessage);
      }
    } catch (error) {
      logger.error('❌ Failed to create audit log:', error);
    }
  }

  /**
   * Determine log level based on action
   */
  private getLogLevel(action: AuditAction): 'info' | 'warn' | 'error' {
    const errorActions = [
      AuditAction.MESSAGE_FAILED,
      AuditAction.CAMPAIGN_FAILED,
      AuditAction.FAILED_LOGIN_ATTEMPT,
      AuditAction.ACCOUNT_LOCKED,
    ];

    const warnActions = [
      AuditAction.RATE_LIMIT_EXCEEDED,
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.ADMIN_ACTION,
    ];

    if (errorActions.includes(action)) return 'error';
    if (warnActions.includes(action)) return 'warn';
    return 'info';
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(userId: number, limit = 100, offset = 0) {
    try {
      const logs = await ActivityLog.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        raw: true,
      });

      return logs;
    } catch (error) {
      logger.error('Error fetching user logs:', error);
      return [];
    }
  }

  /**
   * Get logs for a specific resource
   */
  async getResourceLogs(resourceType: string, resourceId: string | number, limit = 50) {
    try {
      const logs = await ActivityLog.findAll({
        where: {
          resourceType: resourceType as any,
          resourceId: resourceId as any,
        },
        order: [['createdAt', 'DESC']],
        limit,
        raw: true,
      });

      return logs;
    } catch (error) {
      logger.error('Error fetching resource logs:', error);
      return [];
    }
  }

  /**
   * Get logs by action
   */
  async getLogsByAction(action: AuditAction, limit = 100) {
    try {
      const logs = await ActivityLog.findAll({
        where: { action },
        order: [['createdAt', 'DESC']],
        limit,
        raw: true,
      });

      return logs;
    } catch (error) {
      logger.error('Error fetching logs by action:', error);
      return [];
    }
  }

  /**
   * Get all error actions in last N hours
   */
  async getRecentErrors(hoursBack = 24) {
    try {
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const logs = await ActivityLog.findAll({
        where: {
          level: 'error',
          createdAt: {
            [require('sequelize').Op.gte]: since,
          },
        },
        order: [['createdAt', 'DESC']],
        raw: true,
      });

      return logs;
    } catch (error) {
      logger.error('Error fetching recent errors:', error);
      return [];
    }
  }

  /**
   * Get security-related logs
   */
  async getSecurityLogs(limit = 100) {
    try {
      const securityActions = [
        AuditAction.FAILED_LOGIN_ATTEMPT,
        AuditAction.RATE_LIMIT_EXCEEDED,
        AuditAction.SUSPICIOUS_ACTIVITY,
        AuditAction.ACCOUNT_LOCKED,
        AuditAction.USER_DELETED,
      ];

      const logs = await ActivityLog.findAll({
        where: {
          action: securityActions,
        },
        order: [['createdAt', 'DESC']],
        limit,
        raw: true,
      });

      return logs;
    } catch (error) {
      logger.error('Error fetching security logs:', error);
      return [];
    }
  }

  /**
   * Export audit logs to CSV
   */
  async exportLogs(startDate: Date, endDate: Date) {
    try {
      const logs = await ActivityLog.findAll({
        where: {
          createdAt: {
            [require('sequelize').Op.between]: [startDate, endDate],
          },
        },
        order: [['createdAt', 'DESC']],
      });

      return logs;
    } catch (error) {
      logger.error('Error exporting logs:', error);
      return [];
    }
  }

  /**
   * Delete old audit logs (GDPR/compliance)
   */
  async deleteOldLogs(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await ActivityLog.destroy({
        where: {
          createdAt: {
            [require('sequelize').Op.lt]: cutoffDate,
          },
        },
      });

      logger.info(`🗑️  Deleted ${result} old audit logs (older than ${daysOld} days)`);
      return result;
    } catch (error) {
      logger.error('Error deleting old logs:', error);
      return 0;
    }
  }

  /**
   * Get audit stats
   */
  async getStats(hoursBack = 24) {
    try {
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const totalLogs = await ActivityLog.count({
        where: {
          createdAt: {
            [require('sequelize').Op.gte]: since,
          },
        },
      });

      const errorLogs = await ActivityLog.count({
        where: {
          level: 'error',
          createdAt: {
            [require('sequelize').Op.gte]: since,
          },
        },
      });

      const securityLogs = await ActivityLog.count({
        where: {
          action: [
            AuditAction.FAILED_LOGIN_ATTEMPT,
            AuditAction.RATE_LIMIT_EXCEEDED,
            AuditAction.SUSPICIOUS_ACTIVITY,
          ],
          createdAt: {
            [require('sequelize').Op.gte]: since,
          },
        },
      });

      return {
        totalLogs,
        errorLogs,
        securityLogs,
        period: `${hoursBack} hours`,
      };
    } catch (error) {
      logger.error('Error getting audit stats:', error);
      return null;
    }
  }
}

export default new AuditService();

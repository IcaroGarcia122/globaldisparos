/**
 * JWT Authentication Utils
 * Handles JWT token generation, validation, refresh
 */

import jwt from 'jsonwebtoken';
import envConfig from '../config/validation';
import redisService from '../services/redisService';
import logger from '../utils/logger';

export interface JWTPayload {
  id: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class JWTService {
  /**
   * Generate access token
   */
  generateAccessToken(payload: { id: number; email: string }): string {
    try {
      const token = jwt.sign(payload, envConfig.jwtSecret, {
        expiresIn: envConfig.jwtExpiresIn,
        algorithm: 'HS256',
      });

      return token;
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw error;
    }
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: { id: number; email: string }): string {
    try {
      const token = jwt.sign(payload, envConfig.jwtRefreshSecret, {
        expiresIn: envConfig.jwtRefreshExpiresIn,
        algorithm: 'HS256',
      });

      return token;
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw error;
    }
  }

  /**
   * Generate both tokens
   */
  generateTokenPair(payload: { id: number; email: string }): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 604800, // 7 days in seconds
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, envConfig.jwtSecret) as JWTPayload;
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, envConfig.jwtRefreshSecret) as JWTPayload;
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Check if token is blacklisted
      const isBlacklisted = await redisService.exists(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new Error('Refresh token has been revoked');
      }

      // Generate new tokens
      const tokenPair = this.generateTokenPair({
        id: decoded.id,
        email: decoded.email,
      });

      // Blacklist old refresh token
      await this.revokeRefreshToken(refreshToken);

      return tokenPair;
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Decode token without verification
   */
  decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token) as JWTPayload;
      if (decoded?.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    return expiration < new Date();
  }

  /**
   * Revoke refresh token by adding to blacklist
   */
  async revokeRefreshToken(token: string): Promise<boolean> {
    try {
      const decoded = this.decodeToken(token) as JWTPayload;
      if (!decoded?.exp) return false;

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redisService.set(`blacklist:${token}`, true, ttl);
      }

      return true;
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
      return false;
    }
  }

  /**
   * Revoke all tokens of a user (logout all devices)
   */
  async revokeAllTokens(userId: number): Promise<boolean> {
    try {
      // Get all refresh tokens for this user from Redis using pattern deletion
      await redisService.deletePattern(`user:${userId}:refresh-token:*`);

      logger.info(`✅ Revoked all tokens for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error revoking all tokens:', error);
      return false;
    }
  }

  /**
   * Store refresh token in Redis (for token rotation tracking)
   */
  async storeRefreshToken(userId: number, token: string): Promise<void> {
    try {
      // Convert '30d' to seconds (30 * 24 * 60 * 60 = 2592000)
      await redisService.set(`user:${userId}:refresh-token:${token}`, true, 2592000);
    } catch (error) {
      logger.error('Error storing refresh token:', error);
    }
  }

  /**
   * Get token info
   */
  getTokenInfo(token: string): {
    isValid: boolean;
    isExpired: boolean;
    expiresAt: Date | null;
    payload: any;
  } {
    const payload = this.decodeToken(token);
    const isExpired = this.isTokenExpired(token);
    const expiresAt = this.getTokenExpiration(token);

    return {
      isValid: !isExpired && !!payload,
      isExpired,
      expiresAt,
      payload,
    };
  }
}

export default new JWTService();

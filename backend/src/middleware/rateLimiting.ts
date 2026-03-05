/**
 * Rate Limiting Middleware
 * Global and endpoint-specific rate limiting
 * Using memory store for now - upgrade to Redis for production
 */

import rateLimit from 'express-rate-limit';
import envConfig from '../config/validation';
import logger from '../utils/logger';

/**
 * Global Rate Limiter
 * Applied to all requests
 */
export const globalRateLimiter = rateLimit({
  windowMs: envConfig.rateLimitWindowMs,
  max: envConfig.rateLimitMaxRequests,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and WebSocket
    if (req.path === '/health' || req.path === '/health/live' || req.path.startsWith('/socket.io')) {
      return true;
    }
    return false;
  },
  handler: (req, res) => {
    logger.warn(`⚠️  Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Auth Rate Limiter
 * Stricter limits for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Aumentado de 5 para 50 logins por janela de 15 minutos
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`⚠️  Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many login attempts. Please try again after 15 minutes.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * API Rate Limiter
 * Standard limits for API endpoints
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`⚠️  API rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many API requests. Please try again in a moment.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Campaign Rate Limiter
 * Protect campaign endpoints from abuse
 */
export const campaignRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 campaigns per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID instead of IP
    return `${req.user?.id || req.ip}`;
  },
  handler: (req, res) => {
    logger.warn(`⚠️  Campaign rate limit exceeded for user: ${req.user?.id || req.ip}`);
    res.status(429).json({
      error: 'Too many campaigns created. Please wait before creating another.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Message Rate Limiter
 * Prevent message spam
 */
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.user?.id || req.ip}`;
  },
});

/**
 * Status Polling Rate Limiter
 * Permissive limiter for GET requests (status checks, polling)
 */
export const statusPollingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600, // 600 requests per minute (10 per second)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Only apply to GET requests
    return req.method !== 'GET';
  },
  handler: (req, res) => {
    logger.warn(`⚠️  Status polling rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many status checks. Please wait before trying again.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

export default globalRateLimiter;

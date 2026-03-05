/**
 * Security Headers & CORS Middleware
 * Sets security headers and configures CORS
 */

import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';
import envConfig from '../config/validation';
import logger from '../utils/logger';

/**
 * Apply security headers using Helmet
 */
export const setupSecurityHeaders = (app: Express) => {
  if (!envConfig.helmetEnabled) {
    logger.warn('⚠️  Security headers (Helmet) are disabled!');
    return;
  }

  // Helmet with custom configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    })
  );

  logger.info('✅ Security headers (Helmet) enabled');
};

/**
 * Configure CORS
 */
export const setupCORS = (app: Express) => {
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, curl requests)
      if (!origin || origin === 'null') {
        callback(null, true);
        return;
      }

      if (envConfig.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`⚠️  CORS rejected request from origin: ${origin}`);
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: envConfig.corsCredentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 hours
  };

  app.use(cors(corsOptions));
  logger.info('✅ CORS configured');
};

/**
 * Additional Security Middleware
 */
export const setupAdditionalSecurityMiddleware = (req: any, res: any, next: any) => {
  // Remove server header
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');

  // Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Clickjacking Protection
  res.setHeader('X-Frame-Options', 'DENY');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable x-powered-by
  res.removeHeader('X-Powered-By');

  next();
};

export default { setupSecurityHeaders, setupCORS, setupAdditionalSecurityMiddleware };

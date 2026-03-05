/**
 * Global Error Handler Middleware
 * Catches and formats all errors
 */

import { Express, Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import * as Sentry from '@sentry/node';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Class for operational errors
 */
export class OperationalError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Setup global error handler
 */
export const setupGlobalErrorHandler = (app: Express) => {
  // Catch 404 errors
  app.use((req: Request, res: Response, next: NextFunction) => {
    const error = new OperationalError(404, `Route not found: ${req.path}`);
    next(error);
  });

  // Global error handler middleware
  app.use((error: AppError, req: Request, res: Response, next: NextFunction) => {
    // Set error status code and message
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    const isOperational = error.isOperational ?? false;

    // Log error
    if (statusCode >= 500) {
      logger.error(`❌ Server Error (${statusCode}):`, {
        path: req.path,
        method: req.method,
        message,
        stack: error.stack,
        url: req.url,
        ip: req.ip,
      });

      // Send to Sentry for critical errors
      if (process.env.SENTRY_ENABLED === 'true') {
        Sentry.captureException(error, {
          contexts: {
            request: {
              url: req.url,
              method: req.method,
              query: req.query,
              headers: req.headers,
            },
          },
        });
      }
    } else if (statusCode >= 400) {
      logger.warn(`⚠️  Client Error (${statusCode}): ${message}`);
    }

    // Prepare error response
    const errorResponse: any = {
      success: false,
      statusCode,
      message,
    };

    // Include validation errors if available
    if (error.errors && Array.isArray(error.errors)) {
      errorResponse.errors = error.errors;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }

    // Don't expose operational errors details in production
    if (!isOperational && process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: 'Internal Server Error. Please try again later.',
      });
    }

    res.status(statusCode).json(errorResponse);
  });

  logger.info('✅ Global error handler configured');
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error handler for different scenarios
 */
export class ErrorHandler {
  static badRequest(message: string, errors?: Array<{ field: string; message: string }>) {
    return new OperationalError(400, message, true, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new OperationalError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new OperationalError(403, message);
  }

  static notFound(resource: string) {
    return new OperationalError(404, `${resource} not found`);
  }

  static conflict(message: string) {
    return new OperationalError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new OperationalError(429, message);
  }

  static internalServerError(message = 'Internal Server Error') {
    return new OperationalError(500, message, false);
  }

  static serviceUnavailable(message = 'Service Unavailable') {
    return new OperationalError(503, message, false);
  }

  static validationError(errors: Array<{ field: string; message: string }>) {
    return new OperationalError(400, 'Validation error', true, errors);
  }

  static databaseError(originalError: Error) {
    logger.error('Database error:', originalError);
    return new OperationalError(500, 'Database operation failed', false);
  }

  static whatsappError(message: string, details?: any) {
    logger.error('WhatsApp error:', details);
    return new OperationalError(500, `WhatsApp error: ${message}`, true);
  }
}

/**
 * Centralized error logger
 */
export const logError = (error: Error, context?: string) => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  logger.error('Error logged:', errorInfo);
};

export default { setupGlobalErrorHandler, asyncHandler, ErrorHandler, logError };

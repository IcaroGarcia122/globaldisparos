/**
 * Enhanced Logger Configuration
 * Winston for production-grade logging with multiple transports
 */

import winston from 'winston';
import path from 'path';
import envConfig from '../config/validation';

const LOG_DIR = path.join(__dirname, '../../logs');

// Custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;
    const meta = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
    return `[${timestamp}] ${level}: ${message} ${meta}`;
  })
);

// Create transports array
const transports: winston.transport[] = [
  // Error logs
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
  }),

  // Warning logs
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'warn.log'),
    level: 'warn',
    maxsize: 10485760,
    maxFiles: 10,
  }),

  // All logs
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'combined.log'),
    maxsize: 10485760,
    maxFiles: 10,
  }),

  // Exception logs
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'exceptions.log'),
    level: 'error',
  }),

  // Rejection logs
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'rejections.log'),
    level: 'error',
  }),
];

// Add console transport in development
if (envConfig.nodeEnv === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
} else {
  // Add console transport in production (for container logs)
  transports.push(
    new winston.transports.Console({
      format: customFormat,
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: envConfig.logLevel,
  format: customFormat,
  defaultMeta: { service: 'globaldisparos-api' },
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'rejections.log'),
    }),
  ],
});

// Add trace method for backward compatibility
(logger as any).trace = (message: string, ...args: any[]) => {
  logger.debug(message, ...args);
};

// Legacy Pino-like interface for compatibility
const pino = logger;

export default logger;
export { pino };

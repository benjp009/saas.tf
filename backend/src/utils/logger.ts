import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'saas-tf-backend',
    environment: config.nodeEnv,
  },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Only log to file in production
if (config.nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}

// Helper function to create child logger with specific context
export const createLogger = (context: string) => {
  return logger.child({ context });
};

// Helper function to log with performance timing
export const logWithTiming = (message: string, startTime: number, metadata?: any) => {
  const duration = Date.now() - startTime;
  logger.info(message, {
    ...metadata,
    duration: `${duration}ms`,
  });
};

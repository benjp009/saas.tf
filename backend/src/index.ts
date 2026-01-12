import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './config/database';
// import { cronService } from './services/cron.service'; // Disabled: Using Cloud Scheduler instead

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection verified');

    // Initialize cron jobs - DISABLED: Using Cloud Scheduler instead
    // cronService.init();
    logger.info('Cron jobs managed by Cloud Scheduler');

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Frontend URL: ${config.frontendUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  // cronService.stop(); // Disabled: Using Cloud Scheduler
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  // cronService.stop(); // Disabled: Using Cloud Scheduler
  process.exit(0);
});

startServer();

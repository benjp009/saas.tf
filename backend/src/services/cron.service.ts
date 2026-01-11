import cron from 'node-cron';
import { subscriptionService } from './subscription.service';
import { logger } from '../utils/logger';
import { config } from '../config';

export class CronService {
  private jobs: cron.ScheduledTask[] = [];

  /**
   * Initialize all cron jobs
   */
  init(): void {
    // Skip cron jobs in test environment
    if (config.nodeEnv === 'test') {
      logger.info('Cron jobs disabled in test environment');
      return;
    }

    logger.info('Initializing cron jobs...');

    // Check expired subscriptions every hour
    this.scheduleExpiredSubscriptionsCheck();

    logger.info(`${this.jobs.length} cron jobs scheduled`);
  }

  /**
   * Check for expired subscriptions and handle grace period
   * Runs every hour
   */
  private scheduleExpiredSubscriptionsCheck(): void {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running expired subscriptions check...');

        await subscriptionService.handleExpiredSubscriptions();

        logger.info('Expired subscriptions check completed');
      } catch (error: any) {
        logger.error('Failed to check expired subscriptions:', {
          error: error.message,
          stack: error.stack,
        });
      }
    });

    this.jobs.push(job);
    logger.info('Scheduled: Expired subscriptions check (every hour)');
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    logger.info('Stopping all cron jobs...');
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
  }

  /**
   * Manually trigger expired subscriptions check (for testing)
   */
  async triggerExpiredCheck(): Promise<void> {
    logger.info('Manually triggering expired subscriptions check...');
    const result = await subscriptionService.handleExpiredSubscriptions();
    logger.info('Manual check completed', result);
  }
}

export const cronService = new CronService();

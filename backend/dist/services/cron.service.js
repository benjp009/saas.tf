"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronService = exports.CronService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const subscription_service_1 = require("./subscription.service");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class CronService {
    jobs = [];
    /**
     * Initialize all cron jobs
     */
    init() {
        // Skip cron jobs in test environment
        if (config_1.config.nodeEnv === 'test') {
            logger_1.logger.info('Cron jobs disabled in test environment');
            return;
        }
        logger_1.logger.info('Initializing cron jobs...');
        // Check expired subscriptions every hour
        this.scheduleExpiredSubscriptionsCheck();
        logger_1.logger.info(`${this.jobs.length} cron jobs scheduled`);
    }
    /**
     * Check for expired subscriptions and handle grace period
     * Runs every hour
     */
    scheduleExpiredSubscriptionsCheck() {
        const job = node_cron_1.default.schedule('0 * * * *', async () => {
            try {
                logger_1.logger.info('Running expired subscriptions check...');
                await subscription_service_1.subscriptionService.handleExpiredSubscriptions();
                logger_1.logger.info('Expired subscriptions check completed');
            }
            catch (error) {
                logger_1.logger.error('Failed to check expired subscriptions:', {
                    error: error.message,
                    stack: error.stack,
                });
            }
        });
        this.jobs.push(job);
        logger_1.logger.info('Scheduled: Expired subscriptions check (every hour)');
    }
    /**
     * Stop all cron jobs
     */
    stop() {
        logger_1.logger.info('Stopping all cron jobs...');
        this.jobs.forEach((job) => job.stop());
        this.jobs = [];
    }
    /**
     * Manually trigger expired subscriptions check (for testing)
     */
    async triggerExpiredCheck() {
        logger_1.logger.info('Manually triggering expired subscriptions check...');
        const result = await subscription_service_1.subscriptionService.handleExpiredSubscriptions();
        logger_1.logger.info('Manual check completed', result);
    }
}
exports.CronService = CronService;
exports.cronService = new CronService();
//# sourceMappingURL=cron.service.js.map
export declare class CronService {
    private jobs;
    /**
     * Initialize all cron jobs
     */
    init(): void;
    /**
     * Check for expired subscriptions and handle grace period
     * Runs every hour
     */
    private scheduleExpiredSubscriptionsCheck;
    /**
     * Stop all cron jobs
     */
    stop(): void;
    /**
     * Manually trigger expired subscriptions check (for testing)
     */
    triggerExpiredCheck(): Promise<void>;
}
export declare const cronService: CronService;
//# sourceMappingURL=cron.service.d.ts.map
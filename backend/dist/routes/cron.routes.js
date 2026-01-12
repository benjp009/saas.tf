"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const cron_service_1 = require("../services/cron.service");
const config_1 = require("../config");
const router = (0, express_1.Router)();
/**
 * Middleware to verify Cloud Scheduler requests
 * Checks for Cloud Scheduler OIDC token or X-CloudScheduler header
 */
const verifyCloudScheduler = (req, res, next) => {
    // In development, allow without verification
    if (config_1.config.nodeEnv !== 'production') {
        return next();
    }
    // Check for Cloud Scheduler header
    const cloudSchedulerHeader = req.headers['x-cloudscheduler'];
    if (cloudSchedulerHeader === 'true') {
        return next();
    }
    // Check for OIDC token in Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // In production, Cloud Scheduler will send OIDC token
        // For now, accept any Bearer token in production
        // TODO: Add proper OIDC token verification
        return next();
    }
    return res.status(401).json({
        error: 'Unauthorized: Only Cloud Scheduler can trigger this endpoint',
        code: 'UNAUTHORIZED'
    });
};
/**
 * Cloud Scheduler trigger for expired subscriptions check
 * POST /api/v1/cron/trigger-expired
 *
 * This endpoint is triggered by Cloud Scheduler every hour to check for
 * expired subscriptions and handle grace periods.
 */
router.post('/trigger-expired', verifyCloudScheduler, async (_req, res) => {
    try {
        await cron_service_1.cronService.triggerExpiredCheck();
        return res.json({
            success: true,
            message: 'Expired subscriptions check completed successfully'
        });
    }
    catch (error) {
        return res.status(500).json({
            error: error.message,
            code: 'CRON_TRIGGER_FAILED'
        });
    }
});
/**
 * Manual trigger for testing (requires authentication)
 * POST /api/v1/cron/trigger-expired/manual
 */
router.post('/trigger-expired/manual', auth_middleware_1.authenticate, async (_req, res) => {
    // Only allow in development
    if (config_1.config.nodeEnv === 'production') {
        return res.status(403).json({
            error: 'Manual cron triggers are disabled in production',
            code: 'FORBIDDEN'
        });
    }
    try {
        await cron_service_1.cronService.triggerExpiredCheck();
        return res.json({
            success: true,
            message: 'Expired subscriptions check completed successfully'
        });
    }
    catch (error) {
        return res.status(500).json({
            error: error.message,
            code: 'CRON_TRIGGER_FAILED'
        });
    }
});
exports.default = router;
//# sourceMappingURL=cron.routes.js.map
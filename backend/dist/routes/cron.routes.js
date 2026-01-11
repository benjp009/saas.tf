"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const cron_service_1 = require("../services/cron.service");
const config_1 = require("../config");
const router = (0, express_1.Router)();
/**
 * Manual trigger for expired subscriptions check
 * POST /api/v1/cron/trigger-expired
 *
 * This endpoint allows manual triggering of the expired subscriptions check
 * for testing purposes. In production, this is restricted to admin users only.
 */
router.post('/trigger-expired', auth_middleware_1.authenticate, async (_req, res) => {
    // In production, restrict to admin users only
    // Note: isAdmin field would need to be added to User model for production use
    // For now, allowing all authenticated users in development
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
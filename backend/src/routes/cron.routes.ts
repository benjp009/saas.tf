import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { cronService } from '../services/cron.service';
import { config } from '../config';

const router = Router();

/**
 * Manual trigger for expired subscriptions check
 * POST /api/v1/cron/trigger-expired
 *
 * This endpoint allows manual triggering of the expired subscriptions check
 * for testing purposes. In production, this is restricted to admin users only.
 */
router.post('/trigger-expired', authenticate, async (_req, res) => {
  // In production, restrict to admin users only
  // Note: isAdmin field would need to be added to User model for production use
  // For now, allowing all authenticated users in development
  if (config.nodeEnv === 'production') {
    return res.status(403).json({
      error: 'Manual cron triggers are disabled in production',
      code: 'FORBIDDEN'
    });
  }

  try {
    await cronService.triggerExpiredCheck();

    return res.json({
      success: true,
      message: 'Expired subscriptions check completed successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
      code: 'CRON_TRIGGER_FAILED'
    });
  }
});

export default router;

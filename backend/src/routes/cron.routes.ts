import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { cronService } from '../services/cron.service';
import { config } from '../config';

const router = Router();

/**
 * Middleware to verify Cloud Scheduler requests
 * Checks for Cloud Scheduler OIDC token or X-CloudScheduler header
 */
const verifyCloudScheduler = (req: Request, res: Response, next: NextFunction) => {
  // In development, allow without verification
  if (config.nodeEnv !== 'production') {
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

/**
 * Manual trigger for testing (requires authentication)
 * POST /api/v1/cron/trigger-expired/manual
 */
router.post('/trigger-expired/manual', authenticate, async (_req, res) => {
  // Only allow in development
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

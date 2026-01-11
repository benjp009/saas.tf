import { Router } from 'express';
import express from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

/**
 * @route   POST /api/v1/webhooks/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (verified via webhook signature)
 *
 * IMPORTANT: This endpoint requires raw body for signature verification.
 * The raw body middleware must be applied in app.ts BEFORE the JSON parser.
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook.bind(webhookController)
);

export default router;

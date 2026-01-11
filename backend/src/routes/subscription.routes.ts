import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * All subscription routes require authentication
 */
router.use(authenticate);

/**
 * @route   GET /api/v1/subscriptions
 * @desc    Get all user's subscriptions with total quota
 * @access  Private
 */
router.get('/', subscriptionController.getUserSubscriptions.bind(subscriptionController));

/**
 * @route   GET /api/v1/subscriptions/current
 * @desc    Get current user's subscription with details
 * @access  Private
 */
router.get('/current', subscriptionController.getCurrentSubscription.bind(subscriptionController));

/**
 * @route   GET /api/v1/subscriptions/plans
 * @desc    Get available subscription plans
 * @access  Private
 */
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

/**
 * @route   POST /api/v1/subscriptions/checkout
 * @desc    Create Stripe checkout session
 * @access  Private
 */
router.post('/checkout', subscriptionController.createCheckout.bind(subscriptionController));

/**
 * @route   POST /api/v1/subscriptions/portal
 * @desc    Get Stripe customer portal URL
 * @access  Private
 */
router.post('/portal', subscriptionController.createPortal.bind(subscriptionController));

/**
 * @route   POST /api/v1/subscriptions/cancel
 * @desc    Cancel current subscription
 * @access  Private
 */
router.post('/cancel', subscriptionController.cancelSubscription.bind(subscriptionController));

/**
 * @route   GET /api/v1/subscriptions/quota
 * @desc    Check subdomain quota and usage
 * @access  Private
 */
router.get('/quota', subscriptionController.checkQuota.bind(subscriptionController));

export default router;

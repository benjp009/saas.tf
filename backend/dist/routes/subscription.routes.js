"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = require("../controllers/subscription.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * All subscription routes require authentication
 */
router.use(auth_middleware_1.authenticate);
/**
 * @route   GET /api/v1/subscriptions
 * @desc    Get all user's subscriptions with total quota
 * @access  Private
 */
router.get('/', subscription_controller_1.subscriptionController.getUserSubscriptions.bind(subscription_controller_1.subscriptionController));
/**
 * @route   GET /api/v1/subscriptions/current
 * @desc    Get current user's subscription with details
 * @access  Private
 */
router.get('/current', subscription_controller_1.subscriptionController.getCurrentSubscription.bind(subscription_controller_1.subscriptionController));
/**
 * @route   GET /api/v1/subscriptions/plans
 * @desc    Get available subscription plans
 * @access  Private
 */
router.get('/plans', subscription_controller_1.subscriptionController.getPlans.bind(subscription_controller_1.subscriptionController));
/**
 * @route   POST /api/v1/subscriptions/checkout
 * @desc    Create Stripe checkout session
 * @access  Private
 */
router.post('/checkout', subscription_controller_1.subscriptionController.createCheckout.bind(subscription_controller_1.subscriptionController));
/**
 * @route   POST /api/v1/subscriptions/portal
 * @desc    Get Stripe customer portal URL
 * @access  Private
 */
router.post('/portal', subscription_controller_1.subscriptionController.createPortal.bind(subscription_controller_1.subscriptionController));
/**
 * @route   POST /api/v1/subscriptions/cancel
 * @desc    Cancel current subscription
 * @access  Private
 */
router.post('/cancel', subscription_controller_1.subscriptionController.cancelSubscription.bind(subscription_controller_1.subscriptionController));
/**
 * @route   GET /api/v1/subscriptions/quota
 * @desc    Check subdomain quota and usage
 * @access  Private
 */
router.get('/quota', subscription_controller_1.subscriptionController.checkQuota.bind(subscription_controller_1.subscriptionController));
exports.default = router;
//# sourceMappingURL=subscription.routes.js.map
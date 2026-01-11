"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const webhook_controller_1 = require("../controllers/webhook.controller");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/webhooks/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (verified via webhook signature)
 *
 * IMPORTANT: This endpoint requires raw body for signature verification.
 * The raw body middleware must be applied in app.ts BEFORE the JSON parser.
 */
router.post('/stripe', express_2.default.raw({ type: 'application/json' }), webhook_controller_1.webhookController.handleStripeWebhook.bind(webhook_controller_1.webhookController));
exports.default = router;
//# sourceMappingURL=webhook.routes.js.map
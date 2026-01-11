"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subdomainCheckLimiter = exports.subdomainCreateLimiter = exports.authLimiter = exports.globalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("../config");
// Global rate limiter
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs, // 15 minutes
    max: config_1.config.rateLimit.maxRequests, // 100 requests per window
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests from this IP, please try again later',
            timestamp: new Date().toISOString(),
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !config_1.config.rateLimit.enabled,
});
// Auth endpoints rate limiter (stricter)
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many authentication attempts, please try again later',
            timestamp: new Date().toISOString(),
        },
    },
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !config_1.config.rateLimit.enabled,
});
// Subdomain creation rate limiter
exports.subdomainCreateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 subdomains per hour
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Subdomain creation rate limit exceeded',
            timestamp: new Date().toISOString(),
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !config_1.config.rateLimit.enabled,
});
// Subdomain availability check rate limiter (lenient)
exports.subdomainCheckLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 checks per minute
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many availability checks',
            timestamp: new Date().toISOString(),
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !config_1.config.rateLimit.enabled,
});
//# sourceMappingURL=rateLimiting.middleware.js.map
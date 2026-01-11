"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const rateLimiting_middleware_1 = require("./middleware/rateLimiting.middleware");
const httpsRedirect_middleware_1 = require("./middleware/httpsRedirect.middleware");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const subdomain_routes_1 = __importDefault(require("./routes/subdomain.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const webhook_routes_1 = __importDefault(require("./routes/webhook.routes"));
const cron_routes_1 = __importDefault(require("./routes/cron.routes"));
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
}));
// HTTPS redirect (production only)
app.use(httpsRedirect_middleware_1.httpsRedirect);
// CORS configuration
app.use((0, cors_1.default)({
    origin: config_1.config.frontendUrl,
    credentials: true,
}));
// Webhook routes MUST come before body parsing middleware
// Stripe requires raw body for signature verification
app.use('/api/v1/webhooks', webhook_routes_1.default);
// Body parsing middleware (with size limits to prevent DoS)
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
// Global rate limiting
app.use(rateLimiting_middleware_1.globalLimiter);
// Request logging middleware
app.use((req, _res, next) => {
    logger_1.logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config_1.config.nodeEnv,
    });
});
// API routes
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/subdomains', subdomain_routes_1.default);
app.use('/api/v1/subscriptions', subscription_routes_1.default);
app.use('/api/v1/cron', cron_routes_1.default);
// 404 handler
app.use(errorHandler_middleware_1.notFoundHandler);
// Error handler (must be last)
app.use(errorHandler_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map
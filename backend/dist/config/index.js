"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
exports.config = {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000', 10),
    // Database
    databaseUrl: process.env.DATABASE_URL,
    // JWT
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    // Google Cloud Platform
    gcp: {
        projectId: process.env.GCP_PROJECT_ID,
        zoneName: process.env.GCP_ZONE_NAME,
        dnsDomain: process.env.GCP_DNS_DOMAIN,
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_SERVICE_ACCOUNT_JSON,
    },
    // Stripe (Phase 2)
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    },
    // SendGrid (Email Notifications)
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@saas.tf',
    },
    // CORS
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    // Rate Limiting
    rateLimit: {
        // Force enabled in production for security
        enabled: process.env.NODE_ENV === 'production'
            ? true
            : process.env.RATE_LIMIT_ENABLED === 'true',
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
};
// Validate required environment variables
const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GCP_PROJECT_ID',
    'GCP_ZONE_NAME',
    'GCP_DNS_DOMAIN',
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
// Validate JWT secret strength in production
if (exports.config.nodeEnv === 'production' && exports.config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters (256 bits) in production');
}
// Validate FRONTEND_URL in production
if (exports.config.nodeEnv === 'production') {
    // Ensure HTTPS is used
    if (!exports.config.frontendUrl.startsWith('https://')) {
        throw new Error('FRONTEND_URL must use HTTPS in production');
    }
    // Ensure not localhost
    if (exports.config.frontendUrl.includes('localhost') ||
        exports.config.frontendUrl.includes('127.0.0.1')) {
        throw new Error('FRONTEND_URL cannot be localhost in production');
    }
    console.log(`Production environment validated - Frontend URL: ${exports.config.frontendUrl}`);
}
//# sourceMappingURL=index.js.map
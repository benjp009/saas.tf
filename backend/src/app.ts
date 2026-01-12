import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { globalLimiter } from './middleware/rateLimiting.middleware';
import { httpsRedirect } from './middleware/httpsRedirect.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import subdomainRoutes from './routes/subdomain.routes';
import subscriptionRoutes from './routes/subscription.routes';
import webhookRoutes from './routes/webhook.routes';
import cronRoutes from './routes/cron.routes';

const app: Application = express();

// Trust proxy - required for Cloud Run/Load Balancer
app.set('trust proxy', true);

// Security middleware
app.use(
  helmet({
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
  })
);

// HTTPS redirect (production only)
app.use(httpsRedirect);

// CORS configuration
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Webhook routes MUST come before body parsing middleware
// Stripe requires raw body for signature verification
app.use('/api/v1/webhooks', webhookRoutes);

// Body parsing middleware (with size limits to prevent DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Global rate limiting
app.use(globalLimiter);

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.url}`, {
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
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/subdomains', subdomainRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/cron', cronRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;

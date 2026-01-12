import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from './index';

export function initSentry(): void {
  // Only initialize Sentry if DSN is provided
  if (!config.sentry.dsn) {
    console.warn('SENTRY_DSN not configured - Sentry error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    integrations: [
      // Enable HTTP calls tracing
      Sentry.httpIntegration(),
      // Enable Express.js middleware tracing
      Sentry.expressIntegration(),
      // Enable CPU profiling
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: config.sentry.tracesSampleRate,
    // Profiling
    profilesSampleRate: config.sentry.profilesSampleRate,
  });

  console.log(`Sentry initialized for environment: ${config.sentry.environment}`);
}

export { Sentry };

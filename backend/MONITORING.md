# Monitoring & Error Tracking Setup

This document explains how to set up and use Sentry for error tracking and monitoring.

## Sentry Integration

### Features
- ✅ Automatic error capturing
- ✅ Performance monitoring
- ✅ CPU profiling
- ✅ Request context tracking
- ✅ User identification
- ✅ Enhanced error logging with Winston

### Setup Instructions

#### 1. Create a Sentry Account
1. Go to [sentry.io](https://sentry.io) and sign up
2. Create a new project for Node.js/Express
3. Copy your DSN (Data Source Name)

#### 2. Configure Environment Variables
Add to your `.env` file:
```bash
# Sentry Error Tracking
SENTRY_DSN=https://your-key@sentry.io/your-project-id
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% profiling
```

#### 3. Deploy
The Sentry integration is already configured in the codebase and will automatically:
- Initialize on app startup
- Capture uncaught exceptions
- Track request performance
- Add user context to errors
- Filter out operational errors (like validation errors)

### What Gets Tracked

#### Errors Captured
- ✅ Unhandled exceptions
- ✅ Database errors
- ✅ API errors (Stripe, Google Cloud DNS)
- ✅ Internal server errors
- ❌ Operational errors (validation, not found, etc.)

#### Performance Tracking
- HTTP request performance
- Database query performance
- External API call performance
- CPU profiling for slow operations

#### Context Included
- Request URL, method, headers
- Request body and query parameters
- User ID (if authenticated)
- IP address
- User agent
- Environment (development/production)

### Viewing Errors in Sentry

1. **Issues Dashboard**: View all errors grouped by type
2. **Performance**: Monitor slow requests and transactions
3. **Releases**: Track errors by deployment version
4. **Alerts**: Set up notifications for critical errors

### Sample Rate Configuration

**Traces Sample Rate (0.1 = 10%)**
- Controls percentage of transactions sent to Sentry
- Higher = more data but higher costs
- Recommended: 0.1 for production, 1.0 for development

**Profiles Sample Rate (0.1 = 10%)**
- Controls CPU profiling frequency
- Higher = better performance insights but more overhead
- Recommended: 0.1 for production

### Testing Sentry Integration

```bash
# Start the server
npm run dev

# Trigger a test error (in development)
curl http://localhost:4000/api/v1/test-error

# Check Sentry dashboard for the error
```

---

## Winston Logging

### Log Levels
- `error`: Error messages (always logged)
- `warn`: Warning messages
- `info`: Informational messages (default)
- `debug`: Debug messages (development only)

### Log Output
- **Console**: Colored, human-readable format
- **File** (production only):
  - `logs/error.log`: Error-level logs only
  - `logs/combined.log`: All logs

### Performance Logging
The application automatically logs:
- ⚠️ Slow requests (>1000ms) as warnings
- 📊 All request durations
- 👤 User IDs for authenticated requests
- 🌐 IP addresses and user agents

### Custom Logging

```typescript
import { logger, createLogger, logWithTiming } from '../utils/logger';

// Basic logging
logger.info('User created', { userId: '123' });
logger.error('Database error', { error: err.message });
logger.warn('Slow operation detected', { duration: '2500ms' });

// Context-specific logger
const dnsLogger = createLogger('DNSService');
dnsLogger.info('DNS record created', { subdomain: 'myapp' });

// Performance logging
const startTime = Date.now();
// ... do work ...
logWithTiming('Operation completed', startTime, { userId: '123' });
```

### Environment Variables

```bash
# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Set to 'debug' in development for verbose logging
LOG_LEVEL=debug
```

---

## Error Handling Best Practices

### 1. Operational vs Programming Errors

**Operational Errors** (Not sent to Sentry):
- Validation errors
- Not found errors
- Authentication errors
- Quota exceeded errors

These are expected and handled by the application.

**Programming Errors** (Sent to Sentry):
- Uncaught exceptions
- Database errors
- API failures
- Null reference errors

These indicate bugs that need fixing.

### 2. Error Context

Always include relevant context in errors:
```typescript
logger.error('Failed to create subdomain', {
  userId,
  subdomainName: name,
  error: err.message,
  stack: err.stack
});
```

### 3. User Privacy

Sensitive data is filtered from Sentry:
- Passwords
- JWT tokens
- API keys
- Credit card numbers

---

## Monitoring Checklist

### Before Production
- [ ] Sentry DSN configured
- [ ] Sample rates adjusted (0.1 recommended)
- [ ] Test error tracking
- [ ] Set up Sentry alerts
- [ ] Configure log file rotation
- [ ] Test slow request warnings

### After Deployment
- [ ] Verify errors appear in Sentry
- [ ] Check performance metrics
- [ ] Monitor slow requests
- [ ] Review log files
- [ ] Set up daily error reports

---

## Troubleshooting

### Sentry Not Capturing Errors
1. Check `SENTRY_DSN` is set correctly
2. Verify environment is not development (or force enable)
3. Check Sentry dashboard for quota limits
4. Verify network connectivity to sentry.io

### Performance Issues
1. Reduce `SENTRY_TRACES_SAMPLE_RATE`
2. Reduce `SENTRY_PROFILES_SAMPLE_RATE`
3. Check log file sizes
4. Verify log rotation is working

### Too Many Logs
1. Increase `LOG_LEVEL` to `warn` or `error`
2. Reduce sample rates
3. Add log filters for noisy endpoints

---

## Cost Optimization

### Sentry Costs
- Free tier: 5,000 errors/month
- Paid plans start at $26/month

**Tips to reduce costs:**
1. Lower sample rates (0.05-0.1)
2. Filter out operational errors
3. Use release tracking to group errors
4. Set up rate limiting for specific error types

### Log Storage
- Logs can grow large in production
- Use log rotation (logrotate)
- Consider cloud logging (Google Cloud Logging, AWS CloudWatch)
- Archive old logs to cold storage

---

## Advanced Configuration

### Custom Error Filtering
Edit [errorHandler.middleware.ts](src/middleware/errorHandler.middleware.ts):
```typescript
// Don't capture specific error types
if (err.code === 'EXPECTED_ERROR') {
  return;
}
```

### Release Tracking
Set release version in Sentry:
```bash
# In CI/CD pipeline
export SENTRY_RELEASE=$(git rev-parse HEAD)
```

### Source Maps
Enable source maps for better stack traces:
```bash
# Build with source maps
npm run build -- --sourceMap

# Upload to Sentry
npx @sentry/cli releases files upload-sourcemaps ./dist
```

---

## Support

For issues with monitoring setup:
1. Check Sentry documentation: https://docs.sentry.io/platforms/node/
2. Review application logs
3. Check Sentry dashboard for configuration issues

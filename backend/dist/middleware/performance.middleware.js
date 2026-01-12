"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceLogger = void 0;
const logger_1 = require("../utils/logger");
/**
 * Middleware to track request performance
 */
const performanceLogger = (req, res, next) => {
    const startTime = Date.now();
    // Store original end function
    const originalEnd = res.end.bind(res);
    // Override end function to log performance
    res.end = function (chunk, encoding, callback) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        // Log slow requests (>1000ms) as warnings
        if (duration > 1000) {
            logger_1.logger.warn('Slow request detected', {
                method: req.method,
                url: req.url,
                statusCode,
                duration: `${duration}ms`,
                userId: req.user?.id,
                ip: req.ip,
            });
        }
        else {
            logger_1.logger.debug('Request completed', {
                method: req.method,
                url: req.url,
                statusCode,
                duration: `${duration}ms`,
                userId: req.user?.id,
            });
        }
        // Call original end function
        return originalEnd(chunk, encoding, callback);
    };
    next();
};
exports.performanceLogger = performanceLogger;
//# sourceMappingURL=performance.middleware.js.map
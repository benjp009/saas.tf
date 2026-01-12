"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const sentry_1 = require("../config/sentry");
const errorHandler = (err, req, res, _next) => {
    // Log error with context
    logger_1.logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.id,
        ip: req.ip,
    });
    // Capture error in Sentry with additional context
    sentry_1.Sentry.withScope((scope) => {
        scope.setContext('request', {
            url: req.url,
            method: req.method,
            headers: req.headers,
            query: req.query,
            body: req.body,
        });
        if (req.user?.id) {
            scope.setUser({ id: req.user.id });
        }
        // Only capture non-operational errors in Sentry
        if (!(err instanceof errors_1.AppError) || !err.isOperational) {
            sentry_1.Sentry.captureException(err);
        }
    });
    // Handle operational errors
    if (err instanceof errors_1.AppError && err.isOperational) {
        return res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
                timestamp: new Date().toISOString(),
            },
        });
    }
    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err;
        if (prismaError.code === 'P2002') {
            return res.status(409).json({
                error: {
                    code: 'CONFLICT',
                    message: 'Resource already exists',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: err.message,
                timestamp: new Date().toISOString(),
            },
        });
    }
    // Default to 500 server error
    return res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'Something went wrong'
                : err.message,
            timestamp: new Date().toISOString(),
        },
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.url} not found`,
            timestamp: new Date().toISOString(),
        },
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.middleware.js.map
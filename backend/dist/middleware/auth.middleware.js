"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
const auth_service_1 = require("../services/auth.service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
/**
 * Middleware to authenticate requests using JWT
 */
const authenticate = async (req, _res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('No token provided', 'NO_TOKEN');
        }
        const token = authHeader.replace('Bearer ', '');
        // Verify token
        const decoded = auth_service_1.authService.verifyToken(token);
        // Get user from database
        const user = await auth_service_1.authService.getUserById(decoded.userId);
        if (!user) {
            throw new errors_1.UnauthorizedError('User not found', 'USER_NOT_FOUND');
        }
        // Attach user to request object
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof errors_1.UnauthorizedError) {
            return next(error);
        }
        logger_1.logger.error('Authentication error:', error);
        return next(new errors_1.UnauthorizedError('Authentication failed', 'AUTH_FAILED'));
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication - doesn't throw error if no token provided
 */
const optionalAuthenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            const decoded = auth_service_1.authService.verifyToken(token);
            const user = await auth_service_1.authService.getUserById(decoded.userId);
            if (user) {
                req.user = user;
            }
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
//# sourceMappingURL=auth.middleware.js.map
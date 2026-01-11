"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const logger_1 = require("../utils/logger");
class AuthController {
    /**
     * Register a new user
     * POST /api/v1/auth/register
     */
    async register(req, res, next) {
        try {
            const { email, password, firstName, lastName } = req.body;
            const result = await auth_service_1.authService.register({
                email,
                password,
                firstName,
                lastName,
            });
            logger_1.logger.info('User registered successfully:', { email });
            res.status(201).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Login user
     * POST /api/v1/auth/login
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_service_1.authService.login({ email, password });
            logger_1.logger.info('User logged in successfully:', { email });
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get current user
     * GET /api/v1/auth/me
     */
    async getCurrentUser(req, res, next) {
        try {
            // User is attached to request by authenticate middleware
            const user = req.user;
            res.status(200).json({ user });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Refresh token
     * POST /api/v1/auth/refresh
     */
    async refreshToken(req, res, next) {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'User not authenticated',
                    },
                });
                return;
            }
            // Generate new token
            const token = auth_service_1.authService.generateToken(user.id);
            res.status(200).json({ token });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Logout (client-side - just remove token)
     * POST /api/v1/auth/logout
     */
    async logout(_req, res, next) {
        try {
            // JWT is stateless, so logout is handled client-side
            // Just return success
            res.status(200).json({
                message: 'Logged out successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map
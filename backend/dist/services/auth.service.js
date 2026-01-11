"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const config_1 = require("../config");
const crypto_1 = require("../utils/crypto");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
class AuthService {
    /**
     * Register a new user
     */
    async register(input) {
        const { email, password, firstName, lastName } = input;
        // Check if user already exists
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new errors_1.ConflictError('Email already in use', 'EMAIL_EXISTS');
        }
        // Hash password
        const passwordHash = await (0, crypto_1.hashPassword)(password);
        // Create user
        const user = await database_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName,
                lastName,
            },
        });
        logger_1.logger.info('User registered:', { userId: user.id, email: user.email });
        // Generate JWT token
        const token = this.generateToken(user.id);
        // Remove password hash from response
        const { passwordHash: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            token,
        };
    }
    /**
     * Login user
     */
    async login(input) {
        const { email, password } = input;
        // Find user by email
        const user = await database_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new errors_1.UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
        }
        // Verify password
        const isValidPassword = await (0, crypto_1.comparePassword)(password, user.passwordHash);
        if (!isValidPassword) {
            throw new errors_1.UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
        }
        // Update last login timestamp
        await database_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        logger_1.logger.info('User logged in:', { userId: user.id, email: user.email });
        // Generate JWT token
        const token = this.generateToken(user.id);
        // Remove password hash from response
        const { passwordHash: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            token,
        };
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return null;
        }
        const { passwordHash: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    /**
     * Generate JWT token
     */
    generateToken(userId) {
        const payload = { userId, type: 'access' };
        const secret = config_1.config.jwtSecret;
        const options = {
            expiresIn: config_1.config.jwtExpiresIn // Type workaround for JWT StringValue type
        };
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            return decoded;
        }
        catch (error) {
            throw new errors_1.UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
        }
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map
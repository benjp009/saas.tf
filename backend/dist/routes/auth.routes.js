"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiting_middleware_1 = require("../middleware/rateLimiting.middleware");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
// Public routes (with rate limiting)
router.post('/register', rateLimiting_middleware_1.authLimiter, (0, validation_middleware_1.validateBody)(validation_1.registerSchema), auth_controller_1.authController.register.bind(auth_controller_1.authController));
router.post('/login', rateLimiting_middleware_1.authLimiter, (0, validation_middleware_1.validateBody)(validation_1.loginSchema), auth_controller_1.authController.login.bind(auth_controller_1.authController));
// Protected routes (require authentication)
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.authController.getCurrentUser.bind(auth_controller_1.authController));
router.post('/refresh', auth_middleware_1.authenticate, auth_controller_1.authController.refreshToken.bind(auth_controller_1.authController));
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.authController.logout.bind(auth_controller_1.authController));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map
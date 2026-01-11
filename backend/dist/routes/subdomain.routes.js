"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subdomain_controller_1 = require("../controllers/subdomain.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const rateLimiting_middleware_1 = require("../middleware/rateLimiting.middleware");
const validation_1 = require("../utils/validation");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// Get all subdomains for current user
router.get('/', subdomain_controller_1.subdomainController.getSubdomains.bind(subdomain_controller_1.subdomainController));
// Check subdomain availability (with rate limiting)
router.get('/check/:name', rateLimiting_middleware_1.subdomainCheckLimiter, (0, validation_middleware_1.validateParams)(joi_1.default.object({
    name: joi_1.default.string().required(),
})), subdomain_controller_1.subdomainController.checkAvailability.bind(subdomain_controller_1.subdomainController));
// Create new subdomain (with rate limiting and validation)
router.post('/', rateLimiting_middleware_1.subdomainCreateLimiter, (0, validation_middleware_1.validateBody)(validation_1.createSubdomainSchema), subdomain_controller_1.subdomainController.createSubdomain.bind(subdomain_controller_1.subdomainController));
// Get single subdomain by ID
router.get('/:id', (0, validation_middleware_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required(),
})), subdomain_controller_1.subdomainController.getSubdomainById.bind(subdomain_controller_1.subdomainController));
// Update subdomain IP address
router.patch('/:id', (0, validation_middleware_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required(),
})), (0, validation_middleware_1.validateBody)(validation_1.updateSubdomainSchema), subdomain_controller_1.subdomainController.updateSubdomain.bind(subdomain_controller_1.subdomainController));
// Delete subdomain
router.delete('/:id', (0, validation_middleware_1.validateParams)(joi_1.default.object({
    id: joi_1.default.string().required(),
})), subdomain_controller_1.subdomainController.deleteSubdomain.bind(subdomain_controller_1.subdomainController));
exports.default = router;
//# sourceMappingURL=subdomain.routes.js.map
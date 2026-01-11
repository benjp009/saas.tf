"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subdomainController = exports.SubdomainController = void 0;
const subdomain_service_1 = require("../services/subdomain.service");
const subscription_service_1 = require("../services/subscription.service");
const logger_1 = require("../utils/logger");
class SubdomainController {
    /**
     * Get all subdomains for the current user
     * GET /api/v1/subdomains
     */
    async getSubdomains(req, res, next) {
        try {
            const userId = req.user.id;
            const subdomains = await subdomain_service_1.subdomainService.getUserSubdomains(userId);
            // Get stats
            const stats = await subdomain_service_1.subdomainService.getStats(userId);
            // Get user's actual subscription quota
            const subscription = await subscription_service_1.subscriptionService.getSubscriptionWithDetails(userId);
            // Get quota check info
            const quotaCheck = await subscription_service_1.subscriptionService.canCreateSubdomain(userId);
            res.status(200).json({
                subdomains,
                stats,
                total: subdomains.length,
                quota: {
                    allowed: quotaCheck.allowed,
                    used: quotaCheck.used,
                    total: quotaCheck.quota,
                    plan: subscription?.plan || 'FREE',
                    subscriptions: quotaCheck.subscriptions,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Check subdomain availability
     * GET /api/v1/subdomains/check/:name
     */
    async checkAvailability(req, res, next) {
        try {
            const { name } = req.params;
            const result = await subdomain_service_1.subdomainService.checkAvailability(name);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create a new subdomain
     * POST /api/v1/subdomains
     */
    async createSubdomain(req, res, next) {
        try {
            const userId = req.user.id;
            const { name, ipAddress } = req.body;
            const subdomain = await subdomain_service_1.subdomainService.createSubdomain({
                name,
                ipAddress,
                userId,
            });
            logger_1.logger.info('Subdomain created via API', {
                userId,
                subdomainId: subdomain.id,
                name: subdomain.name,
            });
            res.status(201).json({ subdomain });
        }
        catch (error) {
            // Handle quota exceeded error specially
            if (error.code === 'QUOTA_EXCEEDED') {
                res.status(403).json({
                    error: {
                        code: 'QUOTA_EXCEEDED',
                        message: error.message,
                        upgradeInfo: error.upgradeInfo,
                    },
                });
                return;
            }
            next(error);
        }
    }
    /**
     * Update subdomain IP address
     * PATCH /api/v1/subdomains/:id
     */
    async updateSubdomain(req, res, next) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { ipAddress } = req.body;
            const subdomain = await subdomain_service_1.subdomainService.updateSubdomain(id, userId, {
                ipAddress,
            });
            logger_1.logger.info('Subdomain updated via API', {
                userId,
                subdomainId: subdomain.id,
                name: subdomain.name,
            });
            res.status(200).json({ subdomain });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete subdomain
     * DELETE /api/v1/subdomains/:id
     */
    async deleteSubdomain(req, res, next) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            await subdomain_service_1.subdomainService.deleteSubdomain(id, userId);
            logger_1.logger.info('Subdomain deleted via API', {
                userId,
                subdomainId: id,
            });
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get single subdomain by ID
     * GET /api/v1/subdomains/:id
     */
    async getSubdomainById(req, res, next) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const subdomain = await subdomain_service_1.subdomainService.getSubdomainById(id, userId);
            if (!subdomain) {
                res.status(404).json({
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Subdomain not found',
                    },
                });
                return;
            }
            res.status(200).json({ subdomain });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SubdomainController = SubdomainController;
exports.subdomainController = new SubdomainController();
//# sourceMappingURL=subdomain.controller.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subdomainService = exports.SubdomainService = void 0;
const database_1 = require("../config/database");
const dns_service_1 = require("./dns.service");
const reserved_subdomains_1 = require("../constants/reserved-subdomains");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const subscription_service_1 = require("./subscription.service");
const stripe_service_1 = require("./stripe.service");
class SubdomainService {
    /**
     * Get all subdomains for a user
     */
    async getUserSubdomains(userId) {
        const subdomains = await database_1.prisma.subdomain.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return subdomains.map((subdomain) => ({
            ...subdomain,
            fullDomain: `${subdomain.name}.saas.tf`,
        }));
    }
    /**
     * Get subdomain by ID
     */
    async getSubdomainById(id, userId) {
        const where = { id };
        if (userId) {
            where.userId = userId;
        }
        const subdomain = await database_1.prisma.subdomain.findUnique({ where });
        if (!subdomain) {
            return null;
        }
        return {
            ...subdomain,
            fullDomain: `${subdomain.name}.saas.tf`,
        };
    }
    /**
     * Check if a subdomain name is available
     */
    async checkAvailability(name) {
        // Validate format
        const validationError = this.validateSubdomainName(name);
        if (validationError) {
            return { available: false, reason: validationError };
        }
        // Check if reserved
        if ((0, reserved_subdomains_1.isReservedSubdomain)(name)) {
            return { available: false, reason: 'reserved' };
        }
        // Check if already taken in database
        const existing = await database_1.prisma.subdomain.findUnique({
            where: { name: name.toLowerCase() },
        });
        if (existing) {
            return { available: false, reason: 'taken' };
        }
        return { available: true };
    }
    /**
     * Validate subdomain name format
     */
    validateSubdomainName(name) {
        // Must be 3-63 characters
        if (name.length < 3) {
            return 'Subdomain must be at least 3 characters';
        }
        if (name.length > 63) {
            return 'Subdomain must not exceed 63 characters';
        }
        // Must start and end with alphanumeric
        if (!/^[a-z0-9]/.test(name)) {
            return 'Subdomain must start with a letter or number';
        }
        if (!/[a-z0-9]$/.test(name)) {
            return 'Subdomain must end with a letter or number';
        }
        // Can only contain lowercase letters, numbers, and hyphens
        if (!/^[a-z0-9-]+$/.test(name)) {
            return 'Subdomain can only contain lowercase letters, numbers, and hyphens';
        }
        // Cannot have consecutive hyphens
        if (/--/.test(name)) {
            return 'Subdomain cannot contain consecutive hyphens';
        }
        return null;
    }
    /**
     * Validate IP address format
     */
    validateIpAddress(ip) {
        // IPv4 validation
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipv4Regex.test(ip);
    }
    /**
     * Create a new subdomain
     */
    async createSubdomain(input) {
        const { name, ipAddress, userId } = input;
        // Normalize subdomain name
        const normalizedName = name.toLowerCase().trim();
        // Validate subdomain name
        const nameError = this.validateSubdomainName(normalizedName);
        if (nameError) {
            throw new errors_1.BadRequestError(nameError, 'INVALID_SUBDOMAIN_NAME');
        }
        // Validate IP address
        if (!this.validateIpAddress(ipAddress)) {
            throw new errors_1.BadRequestError('Invalid IPv4 address', 'INVALID_IP_ADDRESS');
        }
        // Check if reserved
        if ((0, reserved_subdomains_1.isReservedSubdomain)(normalizedName)) {
            throw new errors_1.UnprocessableEntityError('This subdomain is reserved and cannot be used', 'RESERVED_SUBDOMAIN');
        }
        // Check availability
        const existing = await database_1.prisma.subdomain.findUnique({
            where: { name: normalizedName },
        });
        if (existing) {
            throw new errors_1.ConflictError('This subdomain is already taken', 'SUBDOMAIN_TAKEN');
        }
        // Check user's subdomain quota
        const quotaCheck = await subscription_service_1.subscriptionService.canCreateSubdomain(userId);
        if (!quotaCheck.allowed) {
            // Build available upgrade plans for error response
            const availablePlans = [];
            if (stripe_service_1.SUBSCRIPTION_PLANS.PACKAGE_5) {
                availablePlans.push({
                    plan: 'PACKAGE_5',
                    name: stripe_service_1.SUBSCRIPTION_PLANS.PACKAGE_5.name,
                    price: stripe_service_1.SUBSCRIPTION_PLANS.PACKAGE_5.price,
                    quota: stripe_service_1.SUBSCRIPTION_PLANS.PACKAGE_5.subdomainQuota,
                });
            }
            if (stripe_service_1.SUBSCRIPTION_PLANS.PACKAGE_50) {
                availablePlans.push({
                    plan: 'PACKAGE_50',
                    name: stripe_service_1.SUBSCRIPTION_PLANS.PACKAGE_50.name,
                    price: stripe_service_1.SUBSCRIPTION_PLANS.PACKAGE_50.price,
                    quota: stripe_service_1.SUBSCRIPTION_PLANS.PACKAGE_50.subdomainQuota,
                });
            }
            throw new errors_1.QuotaExceededError(`You've reached your limit of ${quotaCheck.quota} subdomains. Upgrade to create more!`, 'QUOTA_EXCEEDED', {
                currentUsed: quotaCheck.used,
                currentQuota: quotaCheck.quota,
                availablePlans,
            });
        }
        logger_1.logger.info('Creating subdomain', {
            name: normalizedName,
            ipAddress,
            userId,
        });
        // Create DNS record
        const dnsResult = await dns_service_1.dnsService.createARecord(normalizedName, ipAddress);
        if (!dnsResult.success) {
            logger_1.logger.error('DNS record creation failed', {
                name: normalizedName,
                error: dnsResult.error,
            });
            throw new errors_1.InternalServerError('Failed to create DNS record. Please try again.', 'DNS_CREATE_FAILED');
        }
        // Create database record
        const subdomain = await database_1.prisma.subdomain.create({
            data: {
                name: normalizedName,
                ipAddress,
                userId,
                dnsRecordId: dnsResult.recordId,
                isActive: true,
            },
        });
        logger_1.logger.info('Subdomain created successfully', {
            id: subdomain.id,
            name: subdomain.name,
            userId,
        });
        return {
            ...subdomain,
            fullDomain: `${subdomain.name}.saas.tf`,
        };
    }
    /**
     * Update subdomain IP address
     */
    async updateSubdomain(id, userId, input) {
        const { ipAddress } = input;
        // Validate IP address
        if (!this.validateIpAddress(ipAddress)) {
            throw new errors_1.BadRequestError('Invalid IPv4 address', 'INVALID_IP_ADDRESS');
        }
        // Get existing subdomain
        const subdomain = await database_1.prisma.subdomain.findUnique({
            where: { id },
        });
        if (!subdomain) {
            throw new errors_1.NotFoundError('Subdomain not found', 'SUBDOMAIN_NOT_FOUND');
        }
        // Check ownership
        if (subdomain.userId !== userId) {
            throw new errors_1.ForbiddenError('You do not have permission to modify this subdomain', 'NOT_OWNER');
        }
        logger_1.logger.info('Updating subdomain', {
            id,
            name: subdomain.name,
            oldIp: subdomain.ipAddress,
            newIp: ipAddress,
        });
        // Update DNS record
        const dnsResult = await dns_service_1.dnsService.updateARecord(subdomain.name, ipAddress, subdomain.ipAddress);
        if (!dnsResult.success) {
            logger_1.logger.error('DNS record update failed', {
                name: subdomain.name,
                error: dnsResult.error,
            });
            throw new errors_1.InternalServerError('Failed to update DNS record. Please try again.', 'DNS_UPDATE_FAILED');
        }
        // Update database record
        const updated = await database_1.prisma.subdomain.update({
            where: { id },
            data: {
                ipAddress,
                updatedAt: new Date(),
            },
        });
        logger_1.logger.info('Subdomain updated successfully', {
            id: updated.id,
            name: updated.name,
            newIp: ipAddress,
        });
        return {
            ...updated,
            fullDomain: `${updated.name}.saas.tf`,
        };
    }
    /**
     * Delete subdomain
     */
    async deleteSubdomain(id, userId) {
        // Get existing subdomain
        const subdomain = await database_1.prisma.subdomain.findUnique({
            where: { id },
        });
        if (!subdomain) {
            throw new errors_1.NotFoundError('Subdomain not found', 'SUBDOMAIN_NOT_FOUND');
        }
        // Check ownership
        if (subdomain.userId !== userId) {
            throw new errors_1.ForbiddenError('You do not have permission to delete this subdomain', 'NOT_OWNER');
        }
        logger_1.logger.info('Deleting subdomain', {
            id,
            name: subdomain.name,
            userId,
        });
        // Delete DNS record
        const dnsResult = await dns_service_1.dnsService.deleteARecord(subdomain.name, subdomain.ipAddress);
        if (!dnsResult.success) {
            logger_1.logger.warn('DNS record deletion failed, continuing with database deletion', {
                name: subdomain.name,
                error: dnsResult.error,
            });
            // Continue anyway - we still want to delete from database
        }
        // Delete from database
        await database_1.prisma.subdomain.delete({
            where: { id },
        });
        logger_1.logger.info('Subdomain deleted successfully', {
            id,
            name: subdomain.name,
        });
    }
    /**
     * Get subdomain statistics
     */
    async getStats(userId) {
        const [total, active, inactive] = await Promise.all([
            database_1.prisma.subdomain.count({ where: { userId } }),
            database_1.prisma.subdomain.count({ where: { userId, isActive: true } }),
            database_1.prisma.subdomain.count({ where: { userId, isActive: false } }),
        ]);
        return { total, active, inactive };
    }
}
exports.SubdomainService = SubdomainService;
exports.subdomainService = new SubdomainService();
//# sourceMappingURL=subdomain.service.js.map
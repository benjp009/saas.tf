"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dnsService = exports.DNSService = void 0;
const dns_1 = require("@google-cloud/dns");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class DNSService {
    dns;
    zone = null;
    zoneName;
    domain;
    constructor() {
        // Initialize Google Cloud DNS client
        const credentials = config_1.config.gcp.credentials;
        this.dns = new dns_1.DNS({
            projectId: config_1.config.gcp.projectId,
            // Handle credentials from file or JSON string
            ...(credentials?.startsWith('{')
                ? { credentials: JSON.parse(credentials) }
                : { keyFilename: credentials }),
        });
        this.zoneName = config_1.config.gcp.zoneName;
        this.domain = config_1.config.gcp.dnsDomain;
        logger_1.logger.info('DNS Service initialized', {
            project: config_1.config.gcp.projectId,
            zone: this.zoneName,
            domain: this.domain,
        });
    }
    /**
     * Get the DNS zone (cached)
     */
    async getZone() {
        if (this.zone) {
            return this.zone;
        }
        try {
            this.zone = this.dns.zone(this.zoneName);
            // Verify zone exists
            const [exists] = await this.zone.exists();
            if (!exists) {
                throw new Error(`DNS zone '${this.zoneName}' does not exist`);
            }
            logger_1.logger.info('DNS zone loaded successfully', { zone: this.zoneName });
            return this.zone;
        }
        catch (error) {
            logger_1.logger.error('Failed to load DNS zone:', error);
            throw new errors_1.InternalServerError('Failed to initialize DNS zone');
        }
    }
    /**
     * Create an A record for a subdomain
     */
    async createARecord(subdomain, ipAddress) {
        try {
            const zone = await this.getZone();
            const fullDomain = `${subdomain}.${this.domain}.`;
            logger_1.logger.info('Creating DNS A record', { subdomain, ipAddress, fullDomain });
            // Create the A record
            const record = zone.record('a', {
                name: fullDomain,
                data: ipAddress,
                ttl: 300, // 5 minutes TTL for faster updates
            });
            // Add the record to the zone
            await zone.addRecords(record);
            logger_1.logger.info('DNS A record created successfully', {
                subdomain,
                fullDomain,
                ipAddress,
            });
            return {
                success: true,
                recordId: fullDomain, // Use full domain as identifier
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create DNS A record:', {
                error: error.message,
                subdomain,
                ipAddress,
            });
            return {
                success: false,
                error: error.message || 'Failed to create DNS record',
            };
        }
    }
    /**
     * Update an existing A record
     */
    async updateARecord(subdomain, newIpAddress, oldIpAddress) {
        try {
            const zone = await this.getZone();
            const fullDomain = `${subdomain}.${this.domain}.`;
            logger_1.logger.info('Updating DNS A record', {
                subdomain,
                fullDomain,
                oldIp: oldIpAddress,
                newIp: newIpAddress,
            });
            // If we have the old IP, we can do an atomic update
            if (oldIpAddress) {
                const oldRecord = zone.record('a', {
                    name: fullDomain,
                    data: oldIpAddress,
                    ttl: 300,
                });
                const newRecord = zone.record('a', {
                    name: fullDomain,
                    data: newIpAddress,
                    ttl: 300,
                });
                // Replace old record with new record
                await zone.createChange({
                    delete: [oldRecord],
                    add: [newRecord],
                });
            }
            else {
                // Delete all existing records for this subdomain and create new one
                await this.deleteARecord(subdomain);
                await this.createARecord(subdomain, newIpAddress);
            }
            logger_1.logger.info('DNS A record updated successfully', {
                subdomain,
                fullDomain,
                newIpAddress,
            });
            return {
                success: true,
                recordId: fullDomain,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to update DNS A record:', {
                error: error.message,
                subdomain,
                newIpAddress,
            });
            return {
                success: false,
                error: error.message || 'Failed to update DNS record',
            };
        }
    }
    /**
     * Delete an A record
     */
    async deleteARecord(subdomain, ipAddress) {
        try {
            const zone = await this.getZone();
            const fullDomain = `${subdomain}.${this.domain}.`;
            logger_1.logger.info('Deleting DNS A record', { subdomain, fullDomain, ipAddress });
            if (ipAddress) {
                // Delete specific record
                const record = zone.record('a', {
                    name: fullDomain,
                    data: ipAddress,
                    ttl: 300,
                });
                await zone.deleteRecords(record);
            }
            else {
                // Get all A records for this subdomain and delete them
                const [records] = await zone.getRecords({ type: 'A', name: fullDomain });
                if (records && records.length > 0) {
                    await zone.deleteRecords(records);
                }
            }
            logger_1.logger.info('DNS A record deleted successfully', { subdomain, fullDomain });
            return {
                success: true,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to delete DNS A record:', {
                error: error.message,
                subdomain,
                ipAddress,
            });
            // Don't throw error if record doesn't exist
            if (error.code === 404 || error.message?.includes('not found')) {
                logger_1.logger.warn('DNS record not found, considering deletion successful', {
                    subdomain,
                });
                return { success: true };
            }
            return {
                success: false,
                error: error.message || 'Failed to delete DNS record',
            };
        }
    }
    /**
     * Check if a subdomain DNS record exists
     */
    async recordExists(subdomain) {
        try {
            const zone = await this.getZone();
            const fullDomain = `${subdomain}.${this.domain}.`;
            const [records] = await zone.getRecords({ type: 'A', name: fullDomain });
            return records && records.length > 0;
        }
        catch (error) {
            logger_1.logger.error('Failed to check if DNS record exists:', error);
            return false;
        }
    }
    /**
     * List all A records in the zone
     */
    async listRecords() {
        try {
            const zone = await this.getZone();
            const [records] = await zone.getRecords({ type: 'A' });
            return records.map((record) => ({
                name: record.name,
                type: record.type,
                ttl: record.ttl,
                data: record.data || [],
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to list DNS records:', error);
            return [];
        }
    }
    /**
     * Get DNS record for a specific subdomain
     */
    async getRecord(subdomain) {
        try {
            const zone = await this.getZone();
            const fullDomain = `${subdomain}.${this.domain}.`;
            const [records] = await zone.getRecords({ type: 'A', name: fullDomain });
            if (!records || records.length === 0) {
                return null;
            }
            const record = records[0];
            return {
                name: record.name,
                type: record.type,
                ttl: record.ttl,
                data: record.data || [],
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get DNS record:', error);
            return null;
        }
    }
    /**
     * Verify DNS service is working
     */
    async healthCheck() {
        try {
            await this.getZone();
            return true;
        }
        catch (error) {
            logger_1.logger.error('DNS service health check failed:', error);
            return false;
        }
    }
}
exports.DNSService = DNSService;
exports.dnsService = new DNSService();
//# sourceMappingURL=dns.service.js.map
import { DNS, Zone } from '@google-cloud/dns';
import { config } from '../config';
import { logger } from '../utils/logger';
import { InternalServerError } from '../utils/errors';

interface DNSRecordResult {
  success: boolean;
  recordId?: string;
  error?: string;
}

interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  data: string[];
}

export class DNSService {
  private dns: DNS;
  private zone: Zone | null = null;
  private readonly zoneName: string;
  private readonly domain: string;

  constructor() {
    // Initialize Google Cloud DNS client
    const credentials = config.gcp.credentials;

    this.dns = new DNS({
      projectId: config.gcp.projectId,
      // Handle credentials from file or JSON string
      ...(credentials?.startsWith('{')
        ? { credentials: JSON.parse(credentials) }
        : { keyFilename: credentials }),
    });

    this.zoneName = config.gcp.zoneName;
    this.domain = config.gcp.dnsDomain;

    logger.info('DNS Service initialized', {
      project: config.gcp.projectId,
      zone: this.zoneName,
      domain: this.domain,
    });
  }

  /**
   * Get the DNS zone (cached)
   */
  private async getZone(): Promise<Zone> {
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

      logger.info('DNS zone loaded successfully', { zone: this.zoneName });
      return this.zone;
    } catch (error) {
      logger.error('Failed to load DNS zone:', error);
      throw new InternalServerError('Failed to initialize DNS zone');
    }
  }

  /**
   * Create an A record for a subdomain
   */
  async createARecord(subdomain: string, ipAddress: string): Promise<DNSRecordResult> {
    try {
      const zone = await this.getZone();
      const fullDomain = `${subdomain}.${this.domain}.`;

      logger.info('Creating DNS A record', { subdomain, ipAddress, fullDomain });

      // Create the A record
      const record = zone.record('a', {
        name: fullDomain,
        data: ipAddress,
        ttl: 300, // 5 minutes TTL for faster updates
      });

      // Add the record to the zone
      await zone.addRecords(record);

      logger.info('DNS A record created successfully', {
        subdomain,
        fullDomain,
        ipAddress,
      });

      return {
        success: true,
        recordId: fullDomain, // Use full domain as identifier
      };
    } catch (error: any) {
      logger.error('Failed to create DNS A record:', {
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
  async updateARecord(
    subdomain: string,
    newIpAddress: string,
    oldIpAddress?: string
  ): Promise<DNSRecordResult> {
    try {
      const zone = await this.getZone();
      const fullDomain = `${subdomain}.${this.domain}.`;

      logger.info('Updating DNS A record', {
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
      } else {
        // Delete all existing records for this subdomain and create new one
        await this.deleteARecord(subdomain);
        await this.createARecord(subdomain, newIpAddress);
      }

      logger.info('DNS A record updated successfully', {
        subdomain,
        fullDomain,
        newIpAddress,
      });

      return {
        success: true,
        recordId: fullDomain,
      };
    } catch (error: any) {
      logger.error('Failed to update DNS A record:', {
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
  async deleteARecord(subdomain: string, ipAddress?: string): Promise<DNSRecordResult> {
    try {
      const zone = await this.getZone();
      const fullDomain = `${subdomain}.${this.domain}.`;

      logger.info('Deleting DNS A record', { subdomain, fullDomain, ipAddress });

      if (ipAddress) {
        // Delete specific record
        const record = zone.record('a', {
          name: fullDomain,
          data: ipAddress,
          ttl: 300,
        });

        await zone.deleteRecords(record);
      } else {
        // Get all A records for this subdomain and delete them
        const [records] = await zone.getRecords({ type: 'A', name: fullDomain });

        if (records && records.length > 0) {
          await zone.deleteRecords(records);
        }
      }

      logger.info('DNS A record deleted successfully', { subdomain, fullDomain });

      return {
        success: true,
      };
    } catch (error: any) {
      logger.error('Failed to delete DNS A record:', {
        error: error.message,
        subdomain,
        ipAddress,
      });

      // Don't throw error if record doesn't exist
      if (error.code === 404 || error.message?.includes('not found')) {
        logger.warn('DNS record not found, considering deletion successful', {
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
  async recordExists(subdomain: string): Promise<boolean> {
    try {
      const zone = await this.getZone();
      const fullDomain = `${subdomain}.${this.domain}.`;

      const [records] = await zone.getRecords({ type: 'A', name: fullDomain });

      return records && records.length > 0;
    } catch (error) {
      logger.error('Failed to check if DNS record exists:', error);
      return false;
    }
  }

  /**
   * List all A records in the zone
   */
  async listRecords(): Promise<DNSRecord[]> {
    try {
      const zone = await this.getZone();
      const [records] = await zone.getRecords({ type: 'A' });

      return records.map((record: any) => ({
        name: record.name,
        type: record.type,
        ttl: record.ttl,
        data: record.data || [],
      }));
    } catch (error) {
      logger.error('Failed to list DNS records:', error);
      return [];
    }
  }

  /**
   * Get DNS record for a specific subdomain
   */
  async getRecord(subdomain: string): Promise<DNSRecord | null> {
    try {
      const zone = await this.getZone();
      const fullDomain = `${subdomain}.${this.domain}.`;

      const [records] = await zone.getRecords({ type: 'A', name: fullDomain });

      if (!records || records.length === 0) {
        return null;
      }

      const record: any = records[0];
      return {
        name: record.name,
        type: record.type,
        ttl: record.ttl,
        data: record.data || [],
      };
    } catch (error) {
      logger.error('Failed to get DNS record:', error);
      return null;
    }
  }

  /**
   * Verify DNS service is working
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getZone();
      return true;
    } catch (error) {
      logger.error('DNS service health check failed:', error);
      return false;
    }
  }
}

export const dnsService = new DNSService();

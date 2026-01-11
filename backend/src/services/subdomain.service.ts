import { Subdomain } from '@prisma/client';
import { prisma } from '../config/database';
import { dnsService } from './dns.service';
import { isReservedSubdomain } from '../constants/reserved-subdomains';
import { logger } from '../utils/logger';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
  ForbiddenError,
  InternalServerError,
  QuotaExceededError,
} from '../utils/errors';
import { subscriptionService } from './subscription.service';
import { SUBSCRIPTION_PLANS } from './stripe.service';

interface CreateSubdomainInput {
  name: string;
  ipAddress: string;
  userId: string;
}

interface UpdateSubdomainInput {
  ipAddress: string;
}

interface SubdomainWithDomain extends Subdomain {
  fullDomain: string;
}

export class SubdomainService {
  /**
   * Get all subdomains for a user
   */
  async getUserSubdomains(userId: string): Promise<SubdomainWithDomain[]> {
    const subdomains = await prisma.subdomain.findMany({
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
  async getSubdomainById(id: string, userId?: string): Promise<SubdomainWithDomain | null> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const subdomain = await prisma.subdomain.findUnique({ where });

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
  async checkAvailability(name: string): Promise<{
    available: boolean;
    reason?: string;
  }> {
    // Validate format
    const validationError = this.validateSubdomainName(name);
    if (validationError) {
      return { available: false, reason: validationError };
    }

    // Check if reserved
    if (isReservedSubdomain(name)) {
      return { available: false, reason: 'reserved' };
    }

    // Check if already taken in database
    const existing = await prisma.subdomain.findUnique({
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
  private validateSubdomainName(name: string): string | null {
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
  private validateIpAddress(ip: string): boolean {
    // IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * Create a new subdomain
   */
  async createSubdomain(input: CreateSubdomainInput): Promise<SubdomainWithDomain> {
    const { name, ipAddress, userId } = input;

    // Normalize subdomain name
    const normalizedName = name.toLowerCase().trim();

    // Validate subdomain name
    const nameError = this.validateSubdomainName(normalizedName);
    if (nameError) {
      throw new BadRequestError(nameError, 'INVALID_SUBDOMAIN_NAME');
    }

    // Validate IP address
    if (!this.validateIpAddress(ipAddress)) {
      throw new BadRequestError('Invalid IPv4 address', 'INVALID_IP_ADDRESS');
    }

    // Check if reserved
    if (isReservedSubdomain(normalizedName)) {
      throw new UnprocessableEntityError(
        'This subdomain is reserved and cannot be used',
        'RESERVED_SUBDOMAIN'
      );
    }

    // Check availability
    const existing = await prisma.subdomain.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      throw new ConflictError(
        'This subdomain is already taken',
        'SUBDOMAIN_TAKEN'
      );
    }

    // Check user's subdomain quota
    const quotaCheck = await subscriptionService.canCreateSubdomain(userId);

    if (!quotaCheck.allowed) {
      // Build available upgrade plans for error response
      const availablePlans = [];
      if (SUBSCRIPTION_PLANS.PACKAGE_5) {
        availablePlans.push({
          plan: 'PACKAGE_5',
          name: SUBSCRIPTION_PLANS.PACKAGE_5.name,
          price: SUBSCRIPTION_PLANS.PACKAGE_5.price,
          quota: SUBSCRIPTION_PLANS.PACKAGE_5.subdomainQuota,
        });
      }
      if (SUBSCRIPTION_PLANS.PACKAGE_50) {
        availablePlans.push({
          plan: 'PACKAGE_50',
          name: SUBSCRIPTION_PLANS.PACKAGE_50.name,
          price: SUBSCRIPTION_PLANS.PACKAGE_50.price,
          quota: SUBSCRIPTION_PLANS.PACKAGE_50.subdomainQuota,
        });
      }

      throw new QuotaExceededError(
        `You've reached your limit of ${quotaCheck.quota} subdomains. Upgrade to create more!`,
        'QUOTA_EXCEEDED',
        {
          currentUsed: quotaCheck.used,
          currentQuota: quotaCheck.quota,
          availablePlans,
        }
      );
    }

    logger.info('Creating subdomain', {
      name: normalizedName,
      ipAddress,
      userId,
    });

    // Create DNS record
    const dnsResult = await dnsService.createARecord(normalizedName, ipAddress);

    if (!dnsResult.success) {
      logger.error('DNS record creation failed', {
        name: normalizedName,
        error: dnsResult.error,
      });
      throw new InternalServerError(
        'Failed to create DNS record. Please try again.',
        'DNS_CREATE_FAILED'
      );
    }

    // Create database record
    const subdomain = await prisma.subdomain.create({
      data: {
        name: normalizedName,
        ipAddress,
        userId,
        dnsRecordId: dnsResult.recordId,
        isActive: true,
      },
    });

    logger.info('Subdomain created successfully', {
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
  async updateSubdomain(
    id: string,
    userId: string,
    input: UpdateSubdomainInput
  ): Promise<SubdomainWithDomain> {
    const { ipAddress } = input;

    // Validate IP address
    if (!this.validateIpAddress(ipAddress)) {
      throw new BadRequestError('Invalid IPv4 address', 'INVALID_IP_ADDRESS');
    }

    // Get existing subdomain
    const subdomain = await prisma.subdomain.findUnique({
      where: { id },
    });

    if (!subdomain) {
      throw new NotFoundError('Subdomain not found', 'SUBDOMAIN_NOT_FOUND');
    }

    // Check ownership
    if (subdomain.userId !== userId) {
      throw new ForbiddenError(
        'You do not have permission to modify this subdomain',
        'NOT_OWNER'
      );
    }

    logger.info('Updating subdomain', {
      id,
      name: subdomain.name,
      oldIp: subdomain.ipAddress,
      newIp: ipAddress,
    });

    // Update DNS record
    const dnsResult = await dnsService.updateARecord(
      subdomain.name,
      ipAddress,
      subdomain.ipAddress
    );

    if (!dnsResult.success) {
      logger.error('DNS record update failed', {
        name: subdomain.name,
        error: dnsResult.error,
      });
      throw new InternalServerError(
        'Failed to update DNS record. Please try again.',
        'DNS_UPDATE_FAILED'
      );
    }

    // Update database record
    const updated = await prisma.subdomain.update({
      where: { id },
      data: {
        ipAddress,
        updatedAt: new Date(),
      },
    });

    logger.info('Subdomain updated successfully', {
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
  async deleteSubdomain(id: string, userId: string): Promise<void> {
    // Get existing subdomain
    const subdomain = await prisma.subdomain.findUnique({
      where: { id },
    });

    if (!subdomain) {
      throw new NotFoundError('Subdomain not found', 'SUBDOMAIN_NOT_FOUND');
    }

    // Check ownership
    if (subdomain.userId !== userId) {
      throw new ForbiddenError(
        'You do not have permission to delete this subdomain',
        'NOT_OWNER'
      );
    }

    logger.info('Deleting subdomain', {
      id,
      name: subdomain.name,
      userId,
    });

    // Delete DNS record
    const dnsResult = await dnsService.deleteARecord(
      subdomain.name,
      subdomain.ipAddress
    );

    if (!dnsResult.success) {
      logger.warn('DNS record deletion failed, continuing with database deletion', {
        name: subdomain.name,
        error: dnsResult.error,
      });
      // Continue anyway - we still want to delete from database
    }

    // Delete from database
    await prisma.subdomain.delete({
      where: { id },
    });

    logger.info('Subdomain deleted successfully', {
      id,
      name: subdomain.name,
    });
  }

  /**
   * Get subdomain statistics
   */
  async getStats(userId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const [total, active, inactive] = await Promise.all([
      prisma.subdomain.count({ where: { userId } }),
      prisma.subdomain.count({ where: { userId, isActive: true } }),
      prisma.subdomain.count({ where: { userId, isActive: false } }),
    ]);

    return { total, active, inactive };
  }
}

export const subdomainService = new SubdomainService();

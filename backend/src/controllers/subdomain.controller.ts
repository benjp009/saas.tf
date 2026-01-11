import { Request, Response, NextFunction } from 'express';
import { subdomainService } from '../services/subdomain.service';
import { subscriptionService } from '../services/subscription.service';
import { logger } from '../utils/logger';

export class SubdomainController {
  /**
   * Get all subdomains for the current user
   * GET /api/v1/subdomains
   */
  async getSubdomains(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const subdomains = await subdomainService.getUserSubdomains(userId);

      // Get stats
      const stats = await subdomainService.getStats(userId);

      // Get user's actual subscription quota
      const subscription = await subscriptionService.getSubscriptionWithDetails(userId);

      // Get quota check info
      const quotaCheck = await subscriptionService.canCreateSubdomain(userId);

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check subdomain availability
   * GET /api/v1/subdomains/check/:name
   */
  async checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.params;

      const result = await subdomainService.checkAvailability(name);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new subdomain
   * POST /api/v1/subdomains
   */
  async createSubdomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, ipAddress } = req.body;

      const subdomain = await subdomainService.createSubdomain({
        name,
        ipAddress,
        userId,
      });

      logger.info('Subdomain created via API', {
        userId,
        subdomainId: subdomain.id,
        name: subdomain.name,
      });

      res.status(201).json({ subdomain });
    } catch (error: any) {
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
  async updateSubdomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { ipAddress } = req.body;

      const subdomain = await subdomainService.updateSubdomain(id, userId, {
        ipAddress,
      });

      logger.info('Subdomain updated via API', {
        userId,
        subdomainId: subdomain.id,
        name: subdomain.name,
      });

      res.status(200).json({ subdomain });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete subdomain
   * DELETE /api/v1/subdomains/:id
   */
  async deleteSubdomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await subdomainService.deleteSubdomain(id, userId);

      logger.info('Subdomain deleted via API', {
        userId,
        subdomainId: id,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single subdomain by ID
   * GET /api/v1/subdomains/:id
   */
  async getSubdomainById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const subdomain = await subdomainService.getSubdomainById(id, userId);

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
    } catch (error) {
      next(error);
    }
  }
}

export const subdomainController = new SubdomainController();

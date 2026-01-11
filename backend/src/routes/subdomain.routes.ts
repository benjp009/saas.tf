import { Router } from 'express';
import { subdomainController } from '../controllers/subdomain.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import {
  subdomainCheckLimiter,
  subdomainCreateLimiter,
} from '../middleware/rateLimiting.middleware';
import { createSubdomainSchema, updateSubdomainSchema } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all subdomains for current user
router.get('/', subdomainController.getSubdomains.bind(subdomainController));

// Check subdomain availability (with rate limiting)
router.get(
  '/check/:name',
  subdomainCheckLimiter,
  validateParams(
    Joi.object({
      name: Joi.string().required(),
    })
  ),
  subdomainController.checkAvailability.bind(subdomainController)
);

// Create new subdomain (with rate limiting and validation)
router.post(
  '/',
  subdomainCreateLimiter,
  validateBody(createSubdomainSchema),
  subdomainController.createSubdomain.bind(subdomainController)
);

// Get single subdomain by ID
router.get(
  '/:id',
  validateParams(
    Joi.object({
      id: Joi.string().required(),
    })
  ),
  subdomainController.getSubdomainById.bind(subdomainController)
);

// Update subdomain IP address
router.patch(
  '/:id',
  validateParams(
    Joi.object({
      id: Joi.string().required(),
    })
  ),
  validateBody(updateSubdomainSchema),
  subdomainController.updateSubdomain.bind(subdomainController)
);

// Delete subdomain
router.delete(
  '/:id',
  validateParams(
    Joi.object({
      id: Joi.string().required(),
    })
  ),
  subdomainController.deleteSubdomain.bind(subdomainController)
);

export default router;

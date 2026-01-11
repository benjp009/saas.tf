import Joi from 'joi';

// User validation schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long',
    }),
  firstName: Joi.string().trim().max(50).optional(),
  lastName: Joi.string().trim().max(50).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

// Subdomain validation schemas
export const subdomainNameSchema = Joi.string()
  .lowercase()
  .trim()
  .min(3)
  .max(63)
  .pattern(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
  .required()
  .messages({
    'string.pattern.base':
      'Subdomain must start and end with alphanumeric characters and contain only lowercase letters, numbers, and hyphens',
    'string.min': 'Subdomain must be at least 3 characters',
    'string.max': 'Subdomain must not exceed 63 characters',
  });

export const ipAddressSchema = Joi.string()
  .ip({ version: ['ipv4'] })
  .required()
  .messages({
    'string.ip': 'Must be a valid IPv4 address',
  });

export const createSubdomainSchema = Joi.object({
  name: subdomainNameSchema,
  ipAddress: ipAddressSchema,
});

export const updateSubdomainSchema = Joi.object({
  ipAddress: ipAddressSchema,
});

// Helper function to validate data against a schema
export const validate = <T>(
  schema: Joi.ObjectSchema<T>,
  data: unknown
): { value: T; error?: Joi.ValidationError } => {
  return schema.validate(data, { abortEarly: false });
};

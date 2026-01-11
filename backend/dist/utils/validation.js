"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.updateSubdomainSchema = exports.createSubdomainSchema = exports.ipAddressSchema = exports.subdomainNameSchema = exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// User validation schemas
exports.registerSchema = joi_1.default.object({
    email: joi_1.default.string().email().lowercase().trim().required(),
    password: joi_1.default.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'string.min': 'Password must be at least 8 characters long',
    }),
    firstName: joi_1.default.string().trim().max(50).optional(),
    lastName: joi_1.default.string().trim().max(50).optional(),
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().lowercase().trim().required(),
    password: joi_1.default.string().required(),
});
// Subdomain validation schemas
exports.subdomainNameSchema = joi_1.default.string()
    .lowercase()
    .trim()
    .min(3)
    .max(63)
    .pattern(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
    .required()
    .messages({
    'string.pattern.base': 'Subdomain must start and end with alphanumeric characters and contain only lowercase letters, numbers, and hyphens',
    'string.min': 'Subdomain must be at least 3 characters',
    'string.max': 'Subdomain must not exceed 63 characters',
});
exports.ipAddressSchema = joi_1.default.string()
    .ip({ version: ['ipv4'] })
    .required()
    .messages({
    'string.ip': 'Must be a valid IPv4 address',
});
exports.createSubdomainSchema = joi_1.default.object({
    name: exports.subdomainNameSchema,
    ipAddress: exports.ipAddressSchema,
});
exports.updateSubdomainSchema = joi_1.default.object({
    ipAddress: exports.ipAddressSchema,
});
// Helper function to validate data against a schema
const validate = (schema, data) => {
    return schema.validate(data, { abortEarly: false });
};
exports.validate = validate;
//# sourceMappingURL=validation.js.map
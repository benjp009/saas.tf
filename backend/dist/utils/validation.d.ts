import Joi from 'joi';
export declare const registerSchema: Joi.ObjectSchema<any>;
export declare const loginSchema: Joi.ObjectSchema<any>;
export declare const subdomainNameSchema: Joi.StringSchema<string>;
export declare const ipAddressSchema: Joi.StringSchema<string>;
export declare const createSubdomainSchema: Joi.ObjectSchema<any>;
export declare const updateSubdomainSchema: Joi.ObjectSchema<any>;
export declare const validate: <T>(schema: Joi.ObjectSchema<T>, data: unknown) => {
    value: T;
    error?: Joi.ValidationError;
};
//# sourceMappingURL=validation.d.ts.map
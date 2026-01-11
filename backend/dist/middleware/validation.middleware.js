"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validateParams = exports.validateBody = void 0;
const errors_1 = require("../utils/errors");
const validateBody = (schema) => {
    return (req, _res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join(', ');
            throw new errors_1.BadRequestError(errorMessage, 'VALIDATION_ERROR');
        }
        req.body = value;
        next();
    };
};
exports.validateBody = validateBody;
const validateParams = (schema) => {
    return (req, _res, next) => {
        const { error, value } = schema.validate(req.params, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join(', ');
            throw new errors_1.BadRequestError(errorMessage, 'VALIDATION_ERROR');
        }
        req.params = value;
        next();
    };
};
exports.validateParams = validateParams;
const validateQuery = (schema) => {
    return (req, _res, next) => {
        const { error, value } = schema.validate(req.query, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join(', ');
            throw new errors_1.BadRequestError(errorMessage, 'VALIDATION_ERROR');
        }
        req.query = value;
        next();
    };
};
exports.validateQuery = validateQuery;
//# sourceMappingURL=validation.middleware.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaExceededError = exports.InternalServerError = exports.TooManyRequestsError = exports.UnprocessableEntityError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    isOperational;
    code;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class BadRequestError extends AppError {
    constructor(message, code) {
        super(message, 400, code || 'BAD_REQUEST');
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', code) {
        super(message, 401, code || 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', code) {
        super(message, 403, code || 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found', code) {
        super(message, 404, code || 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message, code) {
        super(message, 409, code || 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
class UnprocessableEntityError extends AppError {
    constructor(message, code) {
        super(message, 422, code || 'UNPROCESSABLE_ENTITY');
    }
}
exports.UnprocessableEntityError = UnprocessableEntityError;
class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests', code) {
        super(message, 429, code || 'TOO_MANY_REQUESTS');
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class InternalServerError extends AppError {
    constructor(message = 'Internal server error', code) {
        super(message, 500, code || 'INTERNAL_SERVER_ERROR');
    }
}
exports.InternalServerError = InternalServerError;
class QuotaExceededError extends AppError {
    upgradeInfo;
    constructor(message = 'Subdomain quota exceeded', code, upgradeInfo) {
        super(message, 403, code || 'QUOTA_EXCEEDED');
        this.upgradeInfo = upgradeInfo;
    }
}
exports.QuotaExceededError = QuotaExceededError;
//# sourceMappingURL=errors.js.map
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    code?: string;
    constructor(message: string, statusCode: number, code?: string);
}
export declare class BadRequestError extends AppError {
    constructor(message: string, code?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string, code?: string);
}
export declare class UnprocessableEntityError extends AppError {
    constructor(message: string, code?: string);
}
export declare class TooManyRequestsError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class InternalServerError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class QuotaExceededError extends AppError {
    upgradeInfo?: {
        currentUsed: number;
        currentQuota: number;
        availablePlans: Array<{
            plan: string;
            name: string;
            price: number;
            quota: number;
        }>;
    } | undefined;
    constructor(message?: string, code?: string, upgradeInfo?: {
        currentUsed: number;
        currentQuota: number;
        availablePlans: Array<{
            plan: string;
            name: string;
            price: number;
            quota: number;
        }>;
    } | undefined);
}
//# sourceMappingURL=errors.d.ts.map
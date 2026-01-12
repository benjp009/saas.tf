"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logWithTiming = exports.createLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
}));
exports.logger = winston_1.default.createLogger({
    level: config_1.config.logLevel,
    format: logFormat,
    defaultMeta: {
        service: 'saas-tf-backend',
        environment: config_1.config.nodeEnv,
    },
    transports: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
    ],
});
// Only log to file in production
if (config_1.config.nodeEnv === 'production') {
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }));
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/combined.log',
    }));
}
// Helper function to create child logger with specific context
const createLogger = (context) => {
    return exports.logger.child({ context });
};
exports.createLogger = createLogger;
// Helper function to log with performance timing
const logWithTiming = (message, startTime, metadata) => {
    const duration = Date.now() - startTime;
    exports.logger.info(message, {
        ...metadata,
        duration: `${duration}ms`,
    });
};
exports.logWithTiming = logWithTiming;
//# sourceMappingURL=logger.js.map
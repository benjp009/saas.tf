"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const database_1 = require("./config/database");
// import { cronService } from './services/cron.service'; // Disabled: Using Cloud Scheduler instead
const startServer = async () => {
    try {
        // Test database connection
        await database_1.prisma.$queryRaw `SELECT 1`;
        logger_1.logger.info('Database connection verified');
        // Initialize cron jobs - DISABLED: Using Cloud Scheduler instead
        // cronService.init();
        logger_1.logger.info('Cron jobs managed by Cloud Scheduler');
        // Start server
        app_1.default.listen(config_1.config.port, () => {
            logger_1.logger.info(`Server running on port ${config_1.config.port}`);
            logger_1.logger.info(`Environment: ${config_1.config.nodeEnv}`);
            logger_1.logger.info(`Frontend URL: ${config_1.config.frontendUrl}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully...');
    // cronService.stop(); // Disabled: Using Cloud Scheduler
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully...');
    // cronService.stop(); // Disabled: Using Cloud Scheduler
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map
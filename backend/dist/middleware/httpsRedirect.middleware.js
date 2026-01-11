"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpsRedirect = void 0;
const config_1 = require("../config");
/**
 * Middleware to enforce HTTPS in production
 * Redirects HTTP requests to HTTPS
 *
 * This middleware checks the X-Forwarded-Proto header set by proxies
 * (like Railway, Render, or load balancers) to determine if the original
 * request was made over HTTPS.
 */
const httpsRedirect = (req, res, next) => {
    // Only enforce in production
    if (config_1.config.nodeEnv === 'production') {
        // Check X-Forwarded-Proto header (set by proxies/load balancers)
        const forwardedProto = req.headers['x-forwarded-proto'];
        if (forwardedProto !== 'https') {
            // Redirect to HTTPS (301 = permanent redirect)
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
    }
    // Continue to next middleware
    next();
};
exports.httpsRedirect = httpsRedirect;
//# sourceMappingURL=httpsRedirect.middleware.js.map
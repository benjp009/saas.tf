export declare const config: {
    nodeEnv: string;
    port: number;
    databaseUrl: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    gcp: {
        projectId: string;
        zoneName: string;
        dnsDomain: string;
        credentials: string | undefined;
    };
    stripe: {
        secretKey: string | undefined;
        webhookSecret: string | undefined;
        publishableKey: string | undefined;
    };
    sendgrid: {
        apiKey: string | undefined;
        fromEmail: string;
    };
    frontendUrl: string;
    rateLimit: {
        enabled: boolean;
        windowMs: number;
        maxRequests: number;
    };
    logLevel: string;
    sentry: {
        dsn: string | undefined;
        environment: string;
        tracesSampleRate: number;
        profilesSampleRate: number;
    };
};
//# sourceMappingURL=index.d.ts.map
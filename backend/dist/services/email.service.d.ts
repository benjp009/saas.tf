interface SubscriptionCreatedParams {
    email: string;
    name: string;
    plan: string;
    quota: number;
    expiresAt?: Date;
}
interface PaymentSucceededParams {
    email: string;
    amount: number;
    invoiceUrl: string;
    plan?: string;
}
interface PaymentFailedParams {
    email: string;
    amount: number;
    plan?: string;
    reason?: string;
}
interface SubscriptionExpiredParams {
    email: string;
    plan: string;
    subdomainsDeactivated: number;
}
export declare class EmailService {
    private enabled;
    private fromEmail;
    constructor();
    /**
     * Send email using SendGrid
     */
    private sendEmail;
    /**
     * Send subscription created notification
     */
    sendSubscriptionCreated(params: SubscriptionCreatedParams): Promise<boolean>;
    /**
     * Send payment succeeded notification
     */
    sendPaymentSucceeded(params: PaymentSucceededParams): Promise<boolean>;
    /**
     * Send payment failed notification
     */
    sendPaymentFailed(params: PaymentFailedParams): Promise<boolean>;
    /**
     * Send subscription expired notification
     */
    sendSubscriptionExpired(params: SubscriptionExpiredParams): Promise<boolean>;
    /**
     * Check if email service is enabled
     */
    isEnabled(): boolean;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=email.service.d.ts.map
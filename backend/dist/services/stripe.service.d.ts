import Stripe from 'stripe';
export declare const SUBSCRIPTION_PLANS: {
    readonly FREE: {
        readonly name: "Free";
        readonly priceId: null;
        readonly price: 0;
        readonly subdomainQuota: 2;
        readonly features: readonly ["2 subdomains", "Basic DNS management", "Community support"];
    };
    readonly PACKAGE_5: {
        readonly name: "5 Subdomains Package";
        readonly priceId: string;
        readonly price: 1000;
        readonly subdomainQuota: 7;
        readonly features: readonly ["5 extra subdomains", "Full DNS management", "Email support", "Valid for 1 year"];
    };
    readonly PACKAGE_50: {
        readonly name: "50 Subdomains Package";
        readonly priceId: string;
        readonly price: 5000;
        readonly subdomainQuota: 52;
        readonly features: readonly ["50 extra subdomains", "Full DNS management", "Priority email support", "Valid for 1 year"];
    };
};
export declare class StripeService {
    private stripe;
    constructor();
    /**
     * Test Stripe API connectivity on startup
     */
    private testConnectivity;
    /**
     * Check if Stripe is enabled
     */
    isEnabled(): boolean;
    /**
     * Get Stripe instance (throws if not enabled)
     */
    private getStripe;
    /**
     * Create or retrieve a Stripe customer
     */
    createCustomer(params: {
        email: string;
        name?: string;
        userId: string;
    }): Promise<Stripe.Customer>;
    /**
     * Get a Stripe customer by ID
     */
    getCustomer(customerId: string): Promise<Stripe.Customer>;
    /**
     * Create a checkout session for subscription
     */
    createCheckoutSession(params: {
        customerId: string;
        priceId: string;
        successUrl: string;
        cancelUrl: string;
        userId: string;
    }): Promise<Stripe.Checkout.Session>;
    /**
     * Create a billing portal session
     */
    createPortalSession(params: {
        customerId: string;
        returnUrl: string;
    }): Promise<Stripe.BillingPortal.Session>;
    /**
     * Retrieve a subscription
     */
    getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null>;
    /**
     * Cancel a subscription
     */
    cancelSubscription(params: {
        subscriptionId: string;
        cancelAtPeriodEnd?: boolean;
    }): Promise<Stripe.Subscription>;
    /**
     * Reactivate a canceled subscription
     */
    reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(params: {
        payload: string | Buffer;
        signature: string;
        secret: string;
    }): Stripe.Event;
    /**
     * Get invoice details
     */
    getInvoice(invoiceId: string): Promise<Stripe.Invoice | null>;
    /**
     * List customer invoices
     */
    listInvoices(params: {
        customerId: string;
        limit?: number;
    }): Promise<Stripe.Invoice[]>;
}
export declare const stripeService: StripeService;
//# sourceMappingURL=stripe.service.d.ts.map
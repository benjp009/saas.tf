import { Request, Response } from 'express';
export declare class WebhookController {
    /**
     * Handle Stripe webhooks
     * POST /api/v1/webhooks/stripe
     */
    handleStripeWebhook(req: Request, res: Response): Promise<void>;
    /**
     * Handle checkout.session.completed
     */
    private handleCheckoutCompleted;
    /**
     * Handle customer.subscription.updated
     */
    private handleSubscriptionUpdated;
    /**
     * Handle customer.subscription.deleted
     */
    private handleSubscriptionDeleted;
    /**
     * Handle invoice.payment_succeeded
     */
    private handleInvoicePaymentSucceeded;
    /**
     * Handle invoice.payment_failed
     */
    private handleInvoicePaymentFailed;
}
export declare const webhookController: WebhookController;
//# sourceMappingURL=webhook.controller.d.ts.map
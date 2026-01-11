"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class EmailService {
    enabled = false;
    fromEmail;
    constructor() {
        this.fromEmail = config_1.config.sendgrid?.fromEmail || 'noreply@saas.tf';
        if (config_1.config.sendgrid?.apiKey) {
            mail_1.default.setApiKey(config_1.config.sendgrid.apiKey);
            this.enabled = true;
            logger_1.logger.info('Email service initialized (SendGrid)', {
                fromEmail: this.fromEmail,
            });
        }
        else {
            logger_1.logger.warn('SendGrid API key not configured - emails disabled');
        }
    }
    /**
     * Send email using SendGrid
     */
    async sendEmail(params) {
        if (!this.enabled) {
            logger_1.logger.info('Email service disabled - skipping email', {
                to: params.to,
                subject: params.subject,
            });
            return false;
        }
        const msg = {
            to: params.to,
            from: this.fromEmail,
            subject: params.subject,
            text: params.text,
            html: params.html,
        };
        try {
            await mail_1.default.send(msg);
            logger_1.logger.info('Email sent successfully', {
                to: params.to,
                subject: params.subject,
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to send email', {
                error: error.message,
                to: params.to,
                subject: params.subject,
            });
            return false;
        }
    }
    /**
     * Send subscription created notification
     */
    async sendSubscriptionCreated(params) {
        const expiresText = params.expiresAt
            ? `Valid until: ${params.expiresAt.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })}`
            : 'No expiration date';
        const subject = `Welcome to ${params.plan}! 🎉`;
        const text = `
Hi ${params.name},

Your ${params.plan} subscription is now active!

Subscription Details:
- Plan: ${params.plan}
- Subdomain Quota: ${params.quota} subdomains
- ${expiresText}

You can now create up to ${params.quota} subdomains for your applications.

Manage your subscription: ${config_1.config.frontendUrl}/billing
View your subdomains: ${config_1.config.frontendUrl}/dashboard

Thank you for choosing saas.tf!

---
saas.tf Team
    `.trim();
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to ${params.plan}!</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${params.name}</strong>,</p>

      <p>Your ${params.plan} subscription is now active and ready to use!</p>

      <div class="details">
        <h3>📋 Subscription Details</h3>
        <ul>
          <li><strong>Plan:</strong> ${params.plan}</li>
          <li><strong>Subdomain Quota:</strong> ${params.quota} subdomains</li>
          <li><strong>${expiresText}</strong></li>
        </ul>
      </div>

      <p>You can now create up to <strong>${params.quota} subdomains</strong> for your applications.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${config_1.config.frontendUrl}/billing" class="button">Manage Subscription</a>
        <a href="${config_1.config.frontendUrl}/dashboard" class="button">View Subdomains</a>
      </div>

      <p>Thank you for choosing saas.tf!</p>

      <div class="footer">
        <p>saas.tf - Simple Subdomain Management</p>
        <p>Questions? Reply to this email or visit our support page.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
        return this.sendEmail({ to: params.email, subject, text, html });
    }
    /**
     * Send payment succeeded notification
     */
    async sendPaymentSucceeded(params) {
        const amountFormatted = (params.amount / 100).toFixed(2);
        const subject = `Payment Received - $${amountFormatted}`;
        const text = `
Payment Confirmation

Your payment has been processed successfully!

Payment Details:
- Amount: $${amountFormatted}
${params.plan ? `- Plan: ${params.plan}` : ''}
- Status: Paid

${params.invoiceUrl ? `View Invoice: ${params.invoiceUrl}` : ''}

Your subscription is active and all services are available.

Manage billing: ${config_1.config.frontendUrl}/billing

Thank you for your payment!

---
saas.tf Team
    `.trim();
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Received</h1>
    </div>
    <div class="content">
      <p>Your payment has been processed successfully!</p>

      <div class="details">
        <h3>💳 Payment Details</h3>
        <ul>
          <li><strong>Amount:</strong> $${amountFormatted}</li>
          ${params.plan ? `<li><strong>Plan:</strong> ${params.plan}</li>` : ''}
          <li><strong>Status:</strong> <span style="color: #10b981;">✓ Paid</span></li>
        </ul>
      </div>

      <p>Your subscription is active and all services are available.</p>

      <div style="text-align: center; margin: 30px 0;">
        ${params.invoiceUrl ? `<a href="${params.invoiceUrl}" class="button">View Invoice</a>` : ''}
        <a href="${config_1.config.frontendUrl}/billing" class="button">Manage Billing</a>
      </div>

      <p>Thank you for your payment!</p>

      <div class="footer">
        <p>saas.tf - Simple Subdomain Management</p>
        <p>Keep this email for your records.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
        return this.sendEmail({ to: params.email, subject, text, html });
    }
    /**
     * Send payment failed notification
     */
    async sendPaymentFailed(params) {
        const amountFormatted = (params.amount / 100).toFixed(2);
        const subject = `Payment Failed - Action Required`;
        const text = `
Payment Failed - Action Required

We were unable to process your payment.

Payment Details:
- Amount: $${amountFormatted}
${params.plan ? `- Plan: ${params.plan}` : ''}
- Status: Failed
${params.reason ? `- Reason: ${params.reason}` : ''}

Your subscription may be at risk of cancellation if payment is not resolved.

What to do next:
1. Update your payment method at ${config_1.config.frontendUrl}/billing
2. Ensure you have sufficient funds
3. Contact your bank if the issue persists

Update payment method: ${config_1.config.frontendUrl}/billing

If you need assistance, please contact our support team.

---
saas.tf Team
    `.trim();
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0; }
    .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Payment Failed</h1>
    </div>
    <div class="content">
      <div class="warning">
        <strong>⚠️ Action Required:</strong> We were unable to process your payment.
      </div>

      <div class="details">
        <h3>💳 Payment Details</h3>
        <ul>
          <li><strong>Amount:</strong> $${amountFormatted}</li>
          ${params.plan ? `<li><strong>Plan:</strong> ${params.plan}</li>` : ''}
          <li><strong>Status:</strong> <span style="color: #ef4444;">✗ Failed</span></li>
          ${params.reason ? `<li><strong>Reason:</strong> ${params.reason}</li>` : ''}
        </ul>
      </div>

      <p><strong>Your subscription may be at risk of cancellation if payment is not resolved.</strong></p>

      <h3>What to do next:</h3>
      <ol>
        <li>Update your payment method</li>
        <li>Ensure you have sufficient funds</li>
        <li>Contact your bank if the issue persists</li>
      </ol>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${config_1.config.frontendUrl}/billing" class="button">Update Payment Method</a>
      </div>

      <p>If you need assistance, please contact our support team.</p>

      <div class="footer">
        <p>saas.tf - Simple Subdomain Management</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
        return this.sendEmail({ to: params.email, subject, text, html });
    }
    /**
     * Send subscription expired notification
     */
    async sendSubscriptionExpired(params) {
        const subject = `Subscription Expired - ${params.plan}`;
        const deactivatedText = params.subdomainsDeactivated > 0
            ? `${params.subdomainsDeactivated} subdomain(s) have been deactivated as you exceeded your remaining quota.`
            : 'Your remaining subdomains are still active.';
        const text = `
Subscription Expired

Your ${params.plan} subscription has expired.

${deactivatedText}

To restore your full quota and reactivate deactivated subdomains, please purchase a new subscription package.

View available plans: ${config_1.config.frontendUrl}/billing

Thank you for using saas.tf!

---
saas.tf Team
    `.trim();
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .warning { background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Subscription Expired</h1>
    </div>
    <div class="content">
      <div class="warning">
        <strong>Notice:</strong> Your ${params.plan} subscription has expired.
      </div>

      <p>${deactivatedText}</p>

      ${params.subdomainsDeactivated > 0
            ? `
      <p><strong>Deactivated subdomains:</strong> ${params.subdomainsDeactivated}</p>
      <p>These subdomains will no longer resolve until you upgrade your subscription.</p>
      `
            : ''}

      <p>To restore your full quota and reactivate deactivated subdomains, please purchase a new subscription package.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${config_1.config.frontendUrl}/billing" class="button">View Available Plans</a>
      </div>

      <p>Thank you for using saas.tf!</p>

      <div class="footer">
        <p>saas.tf - Simple Subdomain Management</p>
        <p>Questions? Reply to this email or visit our support page.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
        return this.sendEmail({ to: params.email, subject, text, html });
    }
    /**
     * Check if email service is enabled
     */
    isEnabled() {
        return this.enabled;
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
//# sourceMappingURL=email.service.js.map
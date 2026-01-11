#!/bin/bash

# Start Stripe webhook forwarding
# This must be running for Stripe checkout to work in development

echo "=================================================="
echo "Starting Stripe Webhook Forwarding"
echo "=================================================="
echo ""
echo "This will forward Stripe webhooks to your local backend."
echo "Keep this terminal window open while testing."
echo ""

# Check if already logged in
if ! stripe config --list &>/dev/null; then
  echo "You need to login to Stripe first."
  echo "Running: stripe login"
  stripe login
fi

echo ""
echo "Starting webhook forwarding..."
echo "Forwarding to: http://localhost:4000/api/v1/webhooks/stripe"
echo ""
echo "⚠️  IMPORTANT: Copy the webhook signing secret (whsec_...) below"
echo "   and update STRIPE_WEBHOOK_SECRET in backend/.env"
echo ""

stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe

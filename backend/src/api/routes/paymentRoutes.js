import express from 'express';
import { createCheckoutSession, stripeWebhook } from '../controllers/paymentController.js';

const router = express.Router();

/**
 * STRIPE WEBHOOK ROUTE
 * CRITICAL: Must use express.raw to keep the body in buffer format for signature verification.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

/**
 * OTHER PAYMENT ROUTES
 * Use express.json() for these routes as they expect JSON bodies.
 */
router.use(express.json());

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', createCheckoutSession);

export default router;
// Verification Comment: Stripe Integration Active

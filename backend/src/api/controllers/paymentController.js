import Stripe from 'stripe';
import mongoose from 'mongoose';
import { Order } from '../../models/Order.js';
import redis from '../../config/redis.js';
import { orderQueue } from '../../config/queue.js';
import { publishOrderUpdated } from '../../utils/orderEvents.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Create a Stripe Checkout Session
 * @route   POST /api/payments/create-checkout-session
 * @access  Public (Customer Checkout)
 */
export const createCheckoutSession = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        // Resolve jobId -> real MongoDB orderId via Redis (worker stores this mapping)
        const resolvedOrderId = await redis.get(`job_order:${orderId}`);

        // If not in Redis and not a valid ObjectId string, it's definitely an unprocessed Job ID
        if (!resolvedOrderId && !mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(404).json({
                message: "Order not found. The order may still be processing. Please wait a few seconds and try again."
            });
        }

        const lookupId = resolvedOrderId || orderId;
        const order = await Order.findById(lookupId).populate('items.menuItemId');
        if (!order) {
            return res.status(404).json({
                message: "Order not found. The order may still be processing. Please wait a few seconds and try again."
            });
        }

        // Map order items to Stripe line items
        const lineItems = order.items.map(item => ({
            price_data: {
                currency: 'inr', 
                product_data: {
                    name: item.menuItemId?.name || 'Restaurant Item',
                },
                unit_amount: Math.round(item.priceAtOrder * 100),
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            metadata: {
                orderId: order._id.toString(),
            },
            success_url: `${process.env.FRONTEND_URL}/success?orderId=${order._id}`,
            cancel_url: `${process.env.FRONTEND_URL}/cart`,
        });

        return res.status(200).json({ url: session.url });

    } catch (error) {
        console.error("Stripe Session Error:", error.message);
        return res.status(500).json({ message: "Failed to create checkout session" });
    }
};

/**
 * @desc    Stripe Webhook to handle payment events
 * @route   POST /api/payments/webhook
 * @access  Public (Stripe Secure Webhook)
 */
export const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata.orderId;

        // Add job to BullMQ for asynchronous background processing
        // This prevents blocking the webhook response and handles high concurrency safely
        await orderQueue.add('process-paid-order', { 
            orderId,
            stripeSessionId: session.id,
            amountTotal: session.amount_total
        }, { 
            attempts: 3, 
            backoff: { type: 'exponential', delay: 1000 } 
        });

        console.log(`Payment Webhook: Job 'process-paid-order' added for Order ${orderId}`);
    }

    res.status(200).json({ received: true });
};
// Verification Comment: Stripe Logic Implemented

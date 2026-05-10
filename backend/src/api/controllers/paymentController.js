import { Order } from '../../models/Order.js';
import redis from '../../config/redis.js';
import { ORDER_EVENTS_CHANNEL, ORDER_UPDATED_EVENT, publishOrderUpdated } from '../../utils/orderEvents.js';

/**
 * @desc    Mock Webhook to simulate a successful payment (e.g., from Stripe)
 * @route   POST /api/payments/:orderId/mock-pay
 * @access  Public (Simulating an external webhook)
 */
export const mockWebhookPay = async (req, res) => {
    try {
        const paramId = req.params.orderId;

        // 1. Resolve jobId -> real MongoDB orderId via Redis (worker stores this mapping)
        const resolvedOrderId = await redis.get(`job_order:${paramId}`);
        const lookupId = resolvedOrderId || paramId;

        // 2. Find & update the order
        // NOTE: Some legacy orders may not have `customerId` persisted. Since `customerId` is required
        // in the current schema, calling `order.save()` would trigger validation and fail.
        // We only need to mark payment/order state as paid here, so do an atomic update.
        const order = await Order.findByIdAndUpdate(
            lookupId,
            { $set: { status: 'PAID', paymentStatus: 'PAID' } },
            { returnDocument: 'after' }
        ).populate('tableId');

        if (!order) {
            return res.status(404).json({
                message: "Order not found. If you just placed it, please wait a few seconds and try again."
            });
        }

        if (!order.customerId) {
            console.warn(`Payment webhook marked order ${order._id} as PAID, but order is missing customerId (legacy/invalid record).`);
        }

        // 3. Publish the standardized order update event
        const payload = await publishOrderUpdated(order);
        console.log(`Published ${ORDER_UPDATED_EVENT} to '${ORDER_EVENTS_CHANNEL}' for Restaurant: ${payload.restaurantId}, Order: ${order._id}`);

        return res.status(200).json({
            success: true,
            message: "Payment successful. Order updated.",
            order
        });

    } catch (error) {
        console.error("Payment Webhook Error:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

import { Order } from '../../models/Order.js';
import redis from '../../config/redis.js';

/**
 * @desc    Mock Webhook to simulate a successful payment (e.g., from Stripe)
 * @route   POST /api/payments/:orderId/mock-pay
 * @access  Public (Simulating an external webhook)
 */
export const mockWebhookPay = async (req, res) => {
    try {
        const { orderId } = req.params;

        // 1. Find the order and populate table info if it exists
        const order = await Order.findById(orderId).populate('tableId');
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // 2. Update payment status to 'PAID'
        order.paymentStatus = 'PAID';
        await order.save();

        // 3. Publish event to Redis for KDS (Socket.io)
        const payload = JSON.stringify({ 
            orderId: order._id, 
            restaurantId: order.restaurantId,
            status: 'PAID', 
            orderType: order.orderType,
            tableNumber: order.tableId ? order.tableId.tableNumber : 'N/A',
            message: 'Payment Received! Start Cooking.' 
        });

        // Upstash REST client publish
        await redis.publish('kitchen-events', payload);
        console.log(`🔔 Published payment event to 'kitchen-events' for Order: ${order._id}`);

        // 4. Return success
        return res.status(200).json({
            success: true,
            message: "Payment successful. KDS triggered.",
            order
        });

    } catch (error) {
        console.error("Payment Webhook Error:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

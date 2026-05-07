import { orderQueue } from '../../config/queue.js';

export const placeOrder = async (req, res) => {
    try {
        // Extract restaurantId from authenticated user (Force Tenant Isolation)
        const restaurantId = req.user.restaurantId;
        const { customerName, items, totalAmount } = req.body;

        // ✅ Basic Validation
        if (!items || items.length === 0) {
            return res.status(400).json({
                message: "Missing required items.",
            });
        }

        // ✅ Add Job to Queue (Instead of saving directly to MongoDB)
        const job = await orderQueue.add("process-order", {
            restaurantId,
            customerName: customerName || 'Guest',
            items,
            totalAmount: totalAmount || 0,
        }, {
            attempts: 3, // Retry on failure
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        });

        console.log(`✅ Order added to queue. Job ID: ${job.id}`);

        // ✅ Instant Response
        return res.status(202).json({
            message: "Order placed in queue",
            jobId: job.id,
            status: "Pending",
        });

    } catch (error) {
        console.error("❌ Queue Error:", error.message);

        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message,
        });
    }
};
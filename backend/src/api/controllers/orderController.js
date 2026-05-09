import { orderQueue } from '../../config/queue.js';
import { Table } from '../../models/Table.js';
import { Order } from '../../models/Order.js';
import { Menu } from '../../models/Menu.js';
import redis from '../../config/redis.js';
import { generateInvoicePDF } from '../../utils/invoiceGenerator.js';

export const placeOrder = async (req, res) => {
    try {
        // Extract restaurantId from body (Customer token is not tied to one restaurant)
        const customerId = req.customer._id; // Attached by protectCustomer middleware
        const { restaurantId, customerName, items, totalAmount, orderType, tableId } = req.body;

        // ✅ Basic Validation
        if (!restaurantId || !items || items.length === 0) {
            return res.status(400).json({
                message: "Missing required fields or items.",
            });
        }

        // ✅ Handle Dine-In Table Status
        if (orderType === 'DINE_IN' && tableId) {
            await Table.findByIdAndUpdate(tableId, { status: 'OCCUPIED' });
        }

        // ✅ Pre-Flight Inventory Check (before touching the queue)
        for (const item of items) {
            const menuItem = await Menu.findById(item.menuItemId);

            if (!menuItem || !menuItem.isAvailable) {
                return res.status(400).json({ message: "Item is currently unavailable" });
            }

            if (menuItem.availableQuantity < item.quantity) {
                return res.status(400).json({ message: "Not enough quantity available" });
            }
        }

        // ✅ Add Job to Queue (Instead of saving directly to MongoDB)
        const job = await orderQueue.add("process-order", {
            restaurantId,
            customerId,
            customerName: customerName || 'Guest',
            items,
            totalAmount: totalAmount || 0,
            paymentStatus: 'PENDING',
            orderType: orderType || 'DINE_IN',
            tableId: tableId || null,
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

/**
 * @desc    Update order status
 * @route   PATCH /api/orders/:id/status
 * @access  Private (Owner/Manager/Chef)
 */
export const updateOrderStatus = async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const { status } = req.body;

        const allowedStatuses = ['PENDING', 'PAID', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        order.status = status;
        await order.save();

        const payload = JSON.stringify({
            orderId: order._id,
            tableId: order.tableId,
            status: order.status,
            message: `Order is now ${order.status}`
        });

        await redis.publish('order-updates', payload);
        console.log(`🔔 Published status update to 'order-updates' for Order: ${order._id}`);

        return res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error("❌ Update Order Status Error:", error.message);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const downloadInvoice = async (req, res) => {
    try {
        // Corrected population path for nested items
        const order = await Order.findById(req.params.id).populate('items.menuItemId');

        if (!order) {
            return res.status(404).json({ message: 'Order Not Found' });
        }

        generateInvoicePDF(order, res);

    } catch (error) {
        console.error("❌ Download Invoice Error:", error.message);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

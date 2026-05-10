import { orderQueue } from '../../config/queue.js';
import { Table } from '../../models/Table.js';
import { Order } from '../../models/Order.js';
import { Menu } from '../../models/Menu.js';
import redis from '../../config/redis.js';
import { generateInvoicePDF } from '../../utils/invoiceGenerator.js';
import { ORDER_EVENTS_CHANNEL, ORDER_UPDATED_EVENT, publishOrderUpdated } from '../../utils/orderEvents.js';

/**
 * @desc    Get active kitchen orders (PENDING, PAID, PREPARING, READY) for KDS initial load
 * @route   GET /api/orders
 * @access  Private (Owner/Manager/Chef)
 */
export const getKitchenOrders = async (req, res) => {
    try {
        const { status } = req.query;
        const restaurantId = req.user.restaurantId;

        const filter = { restaurantId };

        // Support comma-separated statuses e.g. ?status=PAID,PREPARING
        if (status) {
            const statuses = status.split(',').map((value) => value.trim().toUpperCase());
            filter.status = { $in: statuses };
        } else {
            filter.status = { $in: ['PENDING', 'PAID', 'PREPARING', 'READY'] };
        }

        const orders = await Order.find(filter)
            .populate('items.menuItemId', 'name price')
            .sort({ createdAt: -1 })
            .limit(50);

        return res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Get Kitchen Orders Error:', error.message);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

export const placeOrder = async (req, res) => {
    try {
        const customerId = req.customer._id;
        const { restaurantId, customerName, items, totalAmount, orderType, tableId } = req.body;

        if (!restaurantId || !items || items.length === 0) {
            return res.status(400).json({
                message: "Missing required fields or items.",
            });
        }

        // tableId from QR URL is a display tableNumber (e.g. "4"), not a MongoDB ObjectId
        if (orderType === 'DINE_IN' && tableId) {
            const table = await Table.findOneAndUpdate(
                { restaurantId, tableNumber: String(tableId) },
                { status: 'OCCUPIED' },
                { new: true }
            );

            if (!table) {
                console.warn(`Table number "${tableId}" not found for restaurant ${restaurantId}. Proceeding without table lock.`);
            }
        }

        for (const item of items) {
            const menuItem = await Menu.findById(item.menuItemId);

            if (!menuItem || !menuItem.isAvailable) {
                return res.status(400).json({ message: "Item is currently unavailable" });
            }

            if (menuItem.availableQuantity < item.quantity) {
                return res.status(400).json({ message: "Not enough quantity available" });
            }
        }

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
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        });

        console.log(`Order added to queue. Job ID: ${job.id}`);

        return res.status(202).json({
            message: "Order placed in queue",
            jobId: job.id,
            status: "Pending",
        });

    } catch (error) {
        console.error("Queue Error:", error.message);

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
        const restaurantId = req.user.restaurantId;

        const allowedStatuses = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'REJECTED'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const order = await Order.findOne({ _id: orderId, restaurantId });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        order.status = status;
        await order.save();

        const payload = await publishOrderUpdated(order);
        console.log(`Published ${ORDER_UPDATED_EVENT} to '${ORDER_EVENTS_CHANNEL}' for Restaurant: ${payload.restaurantId}, Order: ${order._id}`);

        return res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error("Update Order Status Error:", error.message);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const downloadInvoice = async (req, res) => {
    try {
        const param = req.params.id;

        // Resolve BullMQ jobId -> real MongoDB orderId via Redis when needed.
        const resolvedOrderId = await redis.get(`job_order:${param}`);
        const lookupId = resolvedOrderId || param;

        const order = await Order.findById(lookupId).populate('items.menuItemId');

        if (!order) {
            return res.status(404).json({ message: 'Order Not Found. The order may still be processing. Please wait a moment and try again.' });
        }

        generateInvoicePDF(order, res);

    } catch (error) {
        console.error("Download Invoice Error:", error.message);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

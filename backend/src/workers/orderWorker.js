import 'dotenv/config';
import { Worker } from 'bullmq';
import connectDB from '../config/db.js';
import connection from '../config/queue.js';
import { Menu } from '../models/Menu.js';
import { Order } from '../models/Order.js';
import redisClient from '../config/redis.js';
import { ORDER_EVENTS_CHANNEL, ORDER_UPDATED_EVENT, publishOrderUpdated } from '../utils/orderEvents.js';

connectDB();

/**
 * The Worker: The Consumer.
 */
/**
 * The Worker: The Consumer.
 * Handles both initial order creation and post-payment processing.
 */
const orderWorker = new Worker('orderQueue', async (job) => {
    console.log(`[Worker] Processing Job: ${job.name} (ID: ${job.id})`);

    try {
        if (job.name === 'process-order') {
            const {
                restaurantId, customerId, customerName, items,
                totalAmount, paymentStatus, orderType, tableId
            } = job.data;

            // In Scenario B, we just create the order in PENDING status.
            // Inventory is deducted only after payment confirmation for high-concurrency safety.
            const newOrder = new Order({
                restaurantId,
                customerId,
                customerName: customerName || 'Guest',
                items: items.map(item => ({
                    ...item,
                    priceAtOrder: item.price // Note: Expecting price to be passed or fetched
                })),
                totalAmount,
                status: 'PENDING',
                paymentStatus: paymentStatus || 'PENDING',
                orderType: orderType || 'DINE_IN',
                tableId: tableId || null
            });

            // If priceAtOrder wasn't provided in job data, we need to fetch it to ensure historical accuracy
            for (let i = 0; i < newOrder.items.length; i++) {
                if (!newOrder.items[i].priceAtOrder) {
                    const menu = await Menu.findById(newOrder.items[i].menuItemId);
                    newOrder.items[i].priceAtOrder = menu.price;
                }
            }

            await newOrder.save();
            console.log(`[Worker] Order ${newOrder._id} created (Pending Payment).`);

            // Store mapping for frontend retrieval
            await redisClient.set(`job_order:${job.id}`, newOrder._id.toString(), { ex: 3600 });
            
            return { orderId: newOrder._id, status: 'CREATED' };
        }

        if (job.name === 'process-paid-order') {
            const { orderId } = job.data;

            // a. Fetch the Order from MongoDB
            const order = await Order.findById(orderId).populate('items.menuItemId');
            if (!order) {
                throw new Error(`Order ${orderId} not found during payment processing.`);
            }

            if (order.paymentStatus === 'PAID') {
                console.log(`[Worker] Order ${orderId} already marked as PAID. Skipping.`);
                return { orderId, status: 'ALREADY_PAID' };
            }

            // b. Update Order status to 'PAID'
            order.status = 'PAID';
            order.paymentStatus = 'PAID';

            // c. Safely deduct inventory using atomic $inc
            for (const item of order.items) {
                const updatedMenu = await Menu.findOneAndUpdate(
                    { 
                        _id: item.menuItemId,
                        availableQuantity: { $gte: item.quantity } 
                    },
                    { $inc: { availableQuantity: -item.quantity } },
                    { new: true }
                );

                if (!updatedMenu) {
                    // In a production app, you might trigger a refund here if inventory ran out between order and payment
                    console.error(`[Worker] CRITICAL: Inventory deduction failed for item ${item.menuItemId} in Order ${orderId}`);
                    throw new Error(`Insufficient inventory for item ${item.menuItemId}`);
                }

                // Auto-disable item if out of stock
                if (updatedMenu.availableQuantity <= 0 && updatedMenu.isAvailable) {
                    updatedMenu.isAvailable = false;
                    await updatedMenu.save();
                    await redisClient.del(`menu_${order.restaurantId}`);
                    console.log(`[Worker] Item ${updatedMenu.name} out of stock. Auto-disabled.`);
                }
            }

            await order.save();
            console.log(`[Worker] Order ${orderId} successfully processed and inventory deducted.`);

            // d. Emit socket event for KDS notification
            const populatedOrder = await Order.findById(orderId).populate(['tableId', 'items.menuItemId']);
            await publishOrderUpdated(populatedOrder);
            
            return { orderId, status: 'SUCCESS' };
        }

    } catch (error) {
        console.error(`[Worker] Error in Job ${job.id} (${job.name}):`, error.message);
        throw error; // Rethrow to let BullMQ handle retries
    }
}, {
    connection,
    concurrency: 5
});

orderWorker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed. Order ID: ${result.orderId}`);
});

orderWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id ?? 'unknown'} failed: ${err.message}`);
});

console.log('Order Worker (standardized order_updated mode) is listening...');

export default orderWorker;

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
const orderWorker = new Worker('orderQueue', async (job) => {
    const { restaurantId, customerName, items, totalAmount } = job.data;

    console.log(`Processing Order Job: ${job.id} for ${customerName}`);

    try {
        const processedItems = [];

        for (const item of items) {
            const { menuItemId, quantity } = item;

            const updatedMenu = await Menu.findOneAndUpdate(
                {
                    _id: menuItemId,
                    availableQuantity: { $gte: quantity }
                },
                {
                    $inc: { availableQuantity: -quantity }
                },
                {
                    new: true
                }
            );

            if (!updatedMenu) {
                throw new Error(`Insufficient Inventory for item: ${menuItemId}`);
            }

            if (updatedMenu.availableQuantity <= 0 && updatedMenu.isAvailable !== false) {
                updatedMenu.isAvailable = false;
                await updatedMenu.save();
                console.log(`Item out of stock. Auto-disabled: ${updatedMenu.name} (${menuItemId})`);

                await redisClient.del(`menu_${restaurantId}`);
                console.log(`Cleared Redis cache: menu_${restaurantId}`);
            }

            processedItems.push({
                menuItemId: updatedMenu._id,
                quantity,
                priceAtOrder: updatedMenu.price
            });
        }

        const newOrder = new Order({
            restaurantId,
            customerName,
            items: processedItems,
            totalAmount,
            status: 'PENDING'
        });

        await newOrder.save();

        console.log(`Order ${newOrder._id} saved successfully.`);

        await redisClient.set(`job_order:${job.id}`, newOrder._id.toString(), { ex: 3600 });

        const payload = await publishOrderUpdated(newOrder);
        console.log(`Published ${ORDER_UPDATED_EVENT} to '${ORDER_EVENTS_CHANNEL}' for Restaurant: ${payload.restaurantId}, Order: ${newOrder._id}`);

        return { orderId: newOrder._id, status: 'SUCCESS' };

    } catch (error) {
        console.error(`Worker Logic Error (Job ${job.id}):`, error.message);
        throw error;
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

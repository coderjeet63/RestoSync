import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Emitter } from "@socket.io/redis-emitter";
import connectDB from '../config/db.js';
import connection from '../config/queue.js';
import { Menu } from '../models/Menu.js';
import { Order } from '../models/Order.js';
import redisClient from '../config/redis.js';

// 1. Connect to Database
connectDB();

// 2. Initialize Socket.io Emitter (Allows separate worker process to emit events)
const emitterRedis = new IORedis(process.env.UPSTASH_REDIS_URL);
const emitter = new Emitter(emitterRedis);

/**
 * The Worker: The Consumer.
 */
const orderWorker = new Worker('orderQueue', async (job) => {
    const { restaurantId, customerName, items, totalAmount } = job.data;

    console.log(`📦 Processing Order Job: ${job.id} for ${customerName}`);

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

            // 🔴 Auto-Kill Switch: Disable item and bust cache if stock hits zero
            if (updatedMenu.availableQuantity <= 0 && updatedMenu.isAvailable !== false) {
                updatedMenu.isAvailable = false;
                await updatedMenu.save();
                console.log(`🚨 Item OUT OF STOCK! Auto-disabled: ${updatedMenu.name} (${menuItemId})`);

                // Cache Buster: force the public menu API to re-fetch from DB
                await redisClient.del(`menu_${restaurantId}`);
                console.log(`🗑️ Cleared Redis cache: menu_${restaurantId}`);
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
            status: 'PENDING' // ✅ Valid enum: ['PENDING','PAID','PREPARING','READY','DELIVERED','CANCELLED']
        });

        await newOrder.save();

        console.log(`✅ Order ${newOrder._id} saved successfully.`);

        // ✅ Store jobId → orderId mapping in Redis (1hr TTL) so frontend can resolve it
        await redisClient.set(`job_order:${job.id}`, newOrder._id.toString(), { ex: 3600 });

        // ⚡ REAL-TIME UPDATE: Notify the frontend that the order is successful
        emitter.emit("order_update", {
            jobId: job.id,
            orderId: newOrder._id,
            status: "PENDING",
            message: "Your order has been placed and is awaiting preparation!"
        });

        return { orderId: newOrder._id, status: 'SUCCESS' };

    } catch (error) {
        console.error(`❌ Worker Logic Error (Job ${job.id}):`, error.message);

        // ⚡ REAL-TIME UPDATE: Notify the frontend about the failure
        emitter.emit("order_update", {
            jobId: job.id,
            status: "FAILED",
            error: error.message
        });

        throw error;
    }
}, {
    connection,
    concurrency: 5
});

// Event Listeners for logging
orderWorker.on('completed', (job, result) => {
    console.log(`🏁 Job ${job.id} completed! Order ID: ${result.orderId}`);
});

orderWorker.on('failed', (job, err) => {
    console.error(`🚩 Job ${job.id} failed: ${err.message}`);
});

console.log('👷 Order Worker (Atomic Mode + Socket Emitter) is listening...');

export default orderWorker;
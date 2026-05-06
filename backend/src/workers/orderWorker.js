import 'dotenv/config';
import { Worker } from 'bullmq';
import connectDB from '../config/db.js';
import connection from '../config/queue.js';
import { Menu } from '../models/Menu.js';
import { Order } from '../models/Order.js';

// 1. Connect to Database (Independent connection for the worker process)
connectDB();

/**
 * The Worker: The Consumer.
 * This process runs in the background, picks up jobs from 'orderQueue',
 * and performs the heavy-duty database operations using Atomic Updates.
 */
const orderWorker = new Worker('orderQueue', async (job) => {
    const { restaurantId, customerName, items, totalAmount } = job.data;

    console.log(`📦 Processing Order Job: ${job.id} for ${customerName}`);

    try {
        const processedItems = [];

        for (const item of items) {
            const { menuItemId, quantity } = item;

            // Use Menu.findOneAndUpdate with a query that strictly checks for sufficient inventory.
            // This is an Atomic Operation ($inc) that prevents race conditions without needing transactions.
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

            // If updatedMenu is null, it means either the item doesn't exist or inventory is insufficient.
            if (!updatedMenu) {
                throw new Error(`Insufficient Inventory for item: ${menuItemId}`);
            }

            // Store for historical order record
            processedItems.push({
                menuItemId: updatedMenu._id,
                quantity,
                priceAtOrder: updatedMenu.price
            });
        }

        // Create and Save the Order document
        const newOrder = new Order({
            restaurantId,
            customerName,
            items: processedItems,
            totalAmount,
            status: 'COMPLETED'
        });

        await newOrder.save();

        console.log(`✅ Order ${newOrder._id} saved successfully.`);

        return { orderId: newOrder._id, status: 'SUCCESS' };

    } catch (error) {
        console.error(`❌ Worker Logic Error (Job ${job.id}):`, error.message);
        // Note: Without transactions (standalone MongoDB), partial inventory decrements 
        // won't automatically roll back. In production, a Replica Set with transactions 
        // is recommended for full ACID compliance.
        throw error; // Triggers BullMQ retry logic
    }
}, {
    connection,
    concurrency: 5 // Process 5 orders in parallel
});

// 2. Event Listeners for logging results
orderWorker.on('completed', (job, result) => {
    console.log(`🏁 Job ${job.id} completed! Order ID: ${result.orderId}`);
});

orderWorker.on('failed', (job, err) => {
    console.error(`🚩 Job ${job.id} failed: ${err.message}`);
});

console.log('👷 Order Worker (Atomic Mode) is up and listening for jobs...');

export default orderWorker;

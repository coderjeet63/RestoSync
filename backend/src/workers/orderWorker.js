import 'dotenv/config';
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import connection from '../config/queue.js';
import { Menu } from '../models/Menu.js';
import { Order } from '../models/Order.js';

// 1. Connect to Database (Independent connection for the worker process)
connectDB();

/**
 * The Worker: The Consumer.
 * This process runs in the background, picks up jobs from 'orderQueue',
 * and performs the heavy-duty database operations.
 */
const orderWorker = new Worker('orderQueue', async (job) => {
    const { restaurantId, customerName, items, totalAmount } = job.data;

    console.log(`📦 Processing Order Job: ${job.id} for ${customerName}`);

    // Start a transaction-like block (Manual validation + decrement)
    // Using standard sequential operations with a mongoose session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const processedItems = [];

        for (const item of items) {
            const { menuItemId, quantity } = item;

            // a. Find item in Menu
            const menuItem = await Menu.findById(menuItemId).session(session);

            if (!menuItem) {
                throw new Error(`Item ${menuItemId} not found in menu.`);
            }

            // b. Check inventory (Inventory verification)
            if (menuItem.availableQuantity < quantity) {
                throw new Error(`Insufficient stock for ${menuItem.name}. Requested: ${quantity}, Available: ${menuItem.availableQuantity}`);
            }

            // c. Decrement availableQuantity (Inventory Update)
            menuItem.availableQuantity -= quantity;
            await menuItem.save({ session });

            // Store for historical order record
            processedItems.push({
                menuItemId: menuItem._id,
                quantity,
                priceAtOrder: menuItem.price
            });
        }

        // d. Create and Save the Order document
        const newOrder = new Order({
            restaurantId,
            customerName,
            items: processedItems,
            totalAmount,
            status: 'COMPLETED' // Mark as completed after processing
        });

        await newOrder.save({ session });
        
        await session.commitTransaction();
        session.endSession();

        console.log(`✅ Order ${newOrder._id} saved successfully.`);

        return { orderId: newOrder._id, status: 'SUCCESS' };

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(`❌ Worker Logic Error (Job ${job.id}):`, error.message);
        throw error; // Throwing error triggers BullMQ retry logic
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

console.log('👷 Order Worker is up and listening for jobs...');

export default orderWorker;

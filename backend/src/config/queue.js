import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// 1. Initialize ioredis connection
// We use the standard Redis URL (TCP) for BullMQ compatibility
const connection = new IORedis(process.env.UPSTASH_REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
});

connection.on('connect', () => {
    console.log('✅ BullMQ Redis (ioredis) connected');
});

connection.on('error', (err) => {
    console.error('❌ BullMQ Redis connection error:', err);
});

// 2. Create and export the orderQueue
export const orderQueue = new Queue('orderQueue', { connection });

export default connection;

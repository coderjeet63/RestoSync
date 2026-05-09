import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';

let io;

/**
 * Initialize Socket.io with Redis Adapter for multi-process communication.
 * @param {Object} httpServer - The native Node.js HTTP server.
 */
export const initSocket = (httpServer) => {
    // 1. Initialize Pub/Sub clients for Redis Adapter
    const pubClient = new IORedis(process.env.UPSTASH_REDIS_URL);
    const subClient = pubClient.duplicate();

    // 2. Initialize Socket.io
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Adjust in production
            methods: ["GET", "POST"]
        }
    });

    // 3. Attach Redis Adapter
    io.adapter(createAdapter(pubClient, subClient));

    // 4. Manual Pub/Sub for custom events
    const manualSubClient = pubClient.duplicate();
    manualSubClient.subscribe('kitchen-events', 'order-updates', (err) => {
        if (err) console.error("Failed to subscribe to Redis channels", err);
    });

    manualSubClient.on('message', (channel, message) => {
        if (channel === 'kitchen-events') {
            io.emit('kitchenEvent', JSON.parse(message));
        } else if (channel === 'order-updates') {
            io.emit('orderStatusUpdated', JSON.parse(message));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 New client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Get the initialized Socket.io instance.
 */
export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { getRestaurantRoom, ORDER_EVENTS_CHANNEL, ORDER_UPDATED_EVENT } from '../utils/orderEvents.js';

let io;

/**
 * Initialize Socket.io with Redis Adapter for multi-process communication.
 * @param {Object} httpServer - The native Node.js HTTP server.
 */
export const initSocket = (httpServer) => {
    const pubClient = new IORedis(process.env.UPSTASH_REDIS_URL);
    const subClient = pubClient.duplicate();

    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ["GET", "POST"]
        }
    });

    io.adapter(createAdapter(pubClient, subClient));

    const manualSubClient = pubClient.duplicate();
    manualSubClient.subscribe(ORDER_EVENTS_CHANNEL, (err) => {
        if (err) {
            console.error("Failed to subscribe to Redis channels", err);
        }
    });

    manualSubClient.on('message', (channel, message) => {
        if (channel !== ORDER_EVENTS_CHANNEL) {
            return;
        }

        const payload = JSON.parse(message);
        if (!payload.restaurantId) {
            return;
        }

        io.to(getRestaurantRoom(payload.restaurantId)).emit(ORDER_UPDATED_EVENT, payload);
    });

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        socket.on('join_restaurant', (data) => {
            const restaurantId = typeof data === 'string' ? data : data?.restaurantId;
            if (!restaurantId) {
                return;
            }

            const room = getRestaurantRoom(restaurantId);
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        });

        socket.on('leave_restaurant', (data) => {
            const restaurantId = typeof data === 'string' ? data : data?.restaurantId;
            if (!restaurantId) {
                return;
            }

            const room = getRestaurantRoom(restaurantId);
            socket.leave(room);
            console.log(`Socket ${socket.id} left room ${room}`);
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
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

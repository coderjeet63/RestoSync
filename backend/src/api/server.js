import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import connectDB from '../config/db.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { bullBoardRouter } from '../config/bullBoard.js';
import { initSocket } from '../config/socket.js';

const app = express();
const httpServer = createServer(app);

// 1. Initialize Socket.io
initSocket(httpServer);

// 2. Connect to MongoDB
connectDB();

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Routes
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/admin/queues', bullBoardRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'RestoSync API is running with Socket.io' });
});

// 5. Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Menu API: http://localhost:${PORT}/api/menus/:restaurantId`);
    console.log(`🔌 Socket.io: Enabled with Redis Adapter`);
});

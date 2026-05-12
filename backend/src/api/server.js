import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import connectDB from '../config/db.js';

// Route Imports
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import customerAuthRoutes from './routes/customerAuthRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import tableRoutes from './routes/tableRoutes.js';

// Other Imports
import { bullBoardRouter } from '../config/bullBoard.js';
import { initSocket } from '../config/socket.js';
import '../workers/orderWorker.js';

const app = express();
const httpServer = createServer(app);

// Environment Constants
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BASE_URL = NODE_ENV === 'production' 
    ? (process.env.BACKEND_URL || `https://restosync-backend.onrender.com`) // Default Render fallback or similar
    : `http://localhost:${PORT}`;

// 1. Initialize Socket.io
initSocket(httpServer);

// 2. Connect to MongoDB
connectDB();

// 3. Middlewares
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

// CRITICAL: Payment routes handled before global express.json() for Webhook Raw Body
app.use('/api/payments', paymentRoutes);

app.use(express.json());

// 4. Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer/auth', customerAuthRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tables', tableRoutes);
app.use('/admin/queues', bullBoardRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'RestoSync API is running with Socket.io' });
});

app.get('/api/test', (req, res) => {
    console.log(`🚥 Traffic Cop sent request to PORT: ${PORT}`);
    res.send(`Hello from Server running on port ${PORT}`);
});

// 5. Start Server
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running in ${NODE_ENV} mode`);
    console.log(`🔗 Base URL: ${BASE_URL}`);
    console.log(`📡 Menu API: ${BASE_URL}/api/menus/:restaurantId`);
    console.log(`🔌 Socket.io: Enabled with Redis Adapter`);
    console.log(`🌍 Frontend URL: ${FRONTEND_URL}`);
});

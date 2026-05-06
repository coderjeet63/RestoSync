import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from '../config/db.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

const app = express();

// 1. Connect to MongoDB
connectDB();

// 2. Middlewares
app.use(cors());
app.use(express.json());

// 3. Routes
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'RestoSync API is running' });
});

// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Menu API: http://localhost:${PORT}/api/menus/:restaurantId`);
});

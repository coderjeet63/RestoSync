import express from 'express';
import { placeOrder } from '../controllers/orderController.js';

import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/orders
router.route('/').post(protect, placeOrder);

export default router;

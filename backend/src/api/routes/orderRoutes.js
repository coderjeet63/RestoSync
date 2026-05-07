import express from 'express';
import { placeOrder } from '../controllers/orderController.js';

import { protectCustomer } from '../middlewares/customerMiddleware.js';

const router = express.Router();

// POST /api/orders
// Only authenticated customers can place orders
router.route('/').post(protectCustomer, placeOrder);

export default router;

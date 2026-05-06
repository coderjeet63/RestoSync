import express from 'express';
import { placeOrder } from '../controllers/orderController.js';

const router = express.Router();

// POST /api/orders - Place a new order
router.post('/', placeOrder);

export default router;

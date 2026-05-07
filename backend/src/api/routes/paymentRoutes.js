import express from 'express';
import { mockWebhookPay } from '../controllers/paymentController.js';

const router = express.Router();

// POST /api/payments/:orderId/mock-pay
// Public route (simulating external secure webhook)
router.post('/:orderId/mock-pay', mockWebhookPay);

export default router;

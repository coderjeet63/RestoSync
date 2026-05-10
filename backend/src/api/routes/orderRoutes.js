import express from 'express';
import {
  getKitchenOrders,
  placeOrder,
  getCustomerOrder,
  updateOrderStatus,
  downloadInvoice
} from '../controllers/orderController.js';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';
import { protectCustomer } from '../middlewares/customerMiddleware.js';

const router = express.Router();

// GET /api/orders — KDS: fetch active orders (PENDING/PAID/PREPARING)
router.get('/', protect, authorizeRoles('OWNER', 'MANAGER', 'CHEF'), getKitchenOrders);

// POST /api/orders — Only authenticated customers can place orders
router.route('/').post(protectCustomer, placeOrder);

// GET /api/orders/:id — Customer fetch for live order tracking
router.get('/:id', protectCustomer, getCustomerOrder);

// PATCH /api/orders/:id/status
// Only B2B Staff can update order cooking status
router.patch('/:id/status', protect, authorizeRoles('OWNER', 'MANAGER', 'CHEF', 'WAITER'), updateOrderStatus);

router.get('/:id/invoice', downloadInvoice);
export default router;  

import express from 'express';
import { getMenuByRestaurant } from '../controllers/menuController.js';

import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/menus/:restaurantId (Public route for Diners to scan QR and view)
router.route('/:restaurantId').get(getMenuByRestaurant);

// If we had POST, PUT, DELETE, they would be protected like this:
// router.route('/').post(protect, createMenu);

export default router;

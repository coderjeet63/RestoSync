import express from 'express';
import { getMenuByRestaurant } from '../controllers/menuController.js';

import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/menus/:restaurantId (We'll change the controller to ignore the param, but the route signature can stay or change. Actually let's just make it /api/menus/my-menu)
// Let's keep /:restaurantId for now and let the controller enforce isolation, or apply protect.
router.route('/').get(protect, getMenuByRestaurant);
router.route('/:restaurantId').get(protect, getMenuByRestaurant);

export default router;

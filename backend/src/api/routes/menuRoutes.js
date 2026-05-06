import express from 'express';
import { getMenuByRestaurant } from '../controllers/menuController.js';

const router = express.Router();

// GET /api/menus/:restaurantId
router.get('/:restaurantId', getMenuByRestaurant);

export default router;

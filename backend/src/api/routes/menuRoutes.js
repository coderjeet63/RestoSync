import express from 'express';
import { getMenuByRestaurant, addMenuItem } from '../controllers/menuController.js';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// GET /api/menus/:restaurantId (Public route for Diners to scan QR and view)
router.route('/:restaurantId').get(getMenuByRestaurant);

// POST /api/menus (Protected route for Owners/Managers to create menu items with Cloudinary image upload)
router.route('/').post(protect, authorizeRoles('OWNER', 'MANAGER'), upload.single('image'), addMenuItem);

export default router;

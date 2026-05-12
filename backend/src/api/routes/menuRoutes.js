import express from 'express';
import { 
    getMenuByRestaurant, 
    addMenuItem, 
    updateMenuItem, 
    deleteMenuItem 
} from '../controllers/menuController.js';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

/**
 * PUBLIC ROUTES
 */
// GET /api/menus/:restaurantId - Fetch menu for diners
router.route('/:restaurantId').get(getMenuByRestaurant);

/**
 * PROTECTED ADMIN ROUTES
 */
// POST /api/menus - Create item
router.route('/').post(
    protect, 
    authorizeRoles('OWNER', 'MANAGER'), 
    upload.single('image'), 
    addMenuItem
);

// PATCH /api/menus/:id - Update item
router.route('/:id').patch(
    protect, 
    authorizeRoles('OWNER', 'MANAGER'), 
    upload.single('image'),
    updateMenuItem
);

// DELETE /api/menus/:id - Delete item
router.route('/:id').delete(
    protect, 
    authorizeRoles('OWNER', 'MANAGER'), 
    deleteMenuItem
);

export default router;

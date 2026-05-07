import express from 'express';
import { getDashboardStats } from '../controllers/analyticsController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/analytics
// Protected route to ensure multi-tenancy isolation
router.get('/', protect, getDashboardStats);

export default router;

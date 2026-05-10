import express from 'express';
import { getDashboardStats } from '../controllers/analyticsController.js';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/analytics/dashboard
// Protected route to ensure multi-tenancy isolation and RBAC (Owner/Manager only)
router.get('/dashboard', protect, authorizeRoles('OWNER', 'MANAGER'), getDashboardStats);

export default router;

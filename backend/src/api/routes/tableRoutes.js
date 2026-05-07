import express from 'express';
import { createTable, getTables } from '../controllers/tableController.js';
import { protect, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected and restricted to OWNER and MANAGER
router.use(protect);
router.use(authorizeRoles('OWNER', 'MANAGER'));

router.route('/')
    .post(createTable)
    .get(getTables);

export default router;

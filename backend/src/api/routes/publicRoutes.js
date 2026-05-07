import express from 'express';
import { getPublicMenu } from '../controllers/publicMenuController.js';

const router = express.Router();

router.get('/menu/:restaurantId', getPublicMenu);

export default router;

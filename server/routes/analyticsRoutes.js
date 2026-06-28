import express from 'express';
import { getDashboardAnalytics } from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected route: Any logged-in user can access, but the controller 
// will dynamically filter the data they receive based on their Role/Location.
router.get('/', protect, getDashboardAnalytics);

export default router;
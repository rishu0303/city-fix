import express from 'express';
import { registerUser, loginUser, getMe, getDepartmentAdmins, approveAdmin } from '../controllers/authController.js';
import { protect, superAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes (requires user login)
router.get('/me', protect, getMe);

// 🔥 NEW: SuperAdmin route to approve DepartmentAdmins
router.get('/users/department-admins', protect, superAdmin, getDepartmentAdmins);
router.patch('/users/:id/approve', protect, superAdmin, approveAdmin);

export default router;

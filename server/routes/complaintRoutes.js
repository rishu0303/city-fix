import express from 'express';
import { createComplaint, getComplaints, getNearbyComplaints, updateComplaintStatus, getDepartmentComplaints } from '../controllers/complaintController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();


// Public route to get complaints near a specific coordinate
router.get('/nearby', getNearbyComplaints);

// Public route to get the general feed
router.get('/', getComplaints);

// 🔥 NEW: Protected Admin route for their specific department feed
router.get('/department', protect, admin, getDepartmentComplaints);

// Protected route to create a complaint (Requires JWT and Image)
// Note: 'image' matches the form-data key we will use in Postman/React
router.post('/', protect, upload.single('image'), createComplaint);

// Protected Admin route to update complaint status
router.patch('/:id/status', protect, admin, upload.single('image'), updateComplaintStatus);

export default router;

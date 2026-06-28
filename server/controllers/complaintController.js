import Complaint from '../models/Complaint.js';
import cloudinary from '../config/cloudinary.js';
import { analyzeComplaint } from '../services/aiService.js';
import { findDuplicate, saveToPinecone } from '../services/pineconeService.js';
import { validateCoordinates } from '../utils/geoValidation.js';

const ALLOWED_STATUSES = ['Submitted', 'In Review', 'Assigned', 'In Progress', 'Resolved', 'Reopened', 'Rejected'];
const STATUS_TRANSITIONS = {
  Submitted: ['In Review', 'Assigned', 'Rejected'],
  'In Review': ['Assigned', 'In Progress', 'Rejected'],
  Assigned: ['In Progress', 'Rejected'],
  'In Progress': ['Resolved', 'Rejected'],
  Resolved: ['Reopened'],
  Reopened: ['In Review', 'Assigned', 'In Progress', 'Rejected'],
  Rejected: ['Reopened']
};

const validateStatusTransition = (currentStatus, nextStatus) => {
  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    return `Invalid status. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}.`;
  }

  if (currentStatus === nextStatus) {
    return null;
  }

  const allowedNextStatuses = STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStatuses.includes(nextStatus)) {
    return `Invalid status transition from ${currentStatus} to ${nextStatus}. Allowed next statuses: ${allowedNextStatuses.join(', ') || 'none'}.`;
  }

  return null;
};

// Helper function to upload an image buffer directly to Cloudinary
const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'cityfix_complaints' },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });
};

// @desc    Create a new complaint
// @route   POST /api/complaints
// @access  Private
export const createComplaint = async (req, res) => {
  try {
    const { title, description, longitude, latitude, addressString } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const coordinateValidation = validateCoordinates({ longitude, latitude });
    if (coordinateValidation.error) {
      return res.status(400).json({
        success: false,
        message: coordinateValidation.error,
        bounds: coordinateValidation.bounds
      });
    }

    // Combine all text for vector search
    const searchText = `${title} ${description} ${addressString}`;

    // 🔥 RUN IN PARALLEL: Cloudinary Upload, Gemini AI Analysis, and Pinecone Search
    const [uploadedImage, aiData, duplicateId] = await Promise.all([
      streamUpload(req.file.buffer),
      analyzeComplaint(description, req.file.buffer, req.file.mimetype),
      findDuplicate(searchText)
    ]);

    // 🛑 DUPLICATE CHECK: If Pinecone found a match, UPVOTE the old one!
    if (duplicateId) {
      const existingComplaint = await Complaint.findById(duplicateId);
      if (existingComplaint) {
        console.log("♻️ Duplicate routed! Upvoting existing complaint instead.");
        existingComplaint.upvotes += 1;
        await existingComplaint.save();
        
        return res.status(200).json({ 
          success: true, 
          message: 'This issue was already reported! We added your upvote to increase its priority.',
          isDuplicate: true,
          complaint: existingComplaint 
        });
      }
    }

    // ✅ NEW COMPLAINT: Save to MongoDB
    const complaint = await Complaint.create({
      title: aiData?.title || title || 'Civic Issue Reported',
      description: description || 'No description provided.',
      user: req.user._id,
      imageUrl: uploadedImage.secure_url,
      
      category: aiData?.category || 'Pending_AI_Review',
      severityRating: aiData?.severityRating || 1,
      aiConfidenceScore: aiData?.aiConfidenceScore || 0,

      location: {
        type: 'Point',
        coordinates: [coordinateValidation.longitude, coordinateValidation.latitude],
        addressString
      }
    });

    // Save the new complaint into Pinecone so it can catch future duplicates
    await saveToPinecone(complaint._id, searchText);

    res.status(201).json({ success: true, ai_routed: !!aiData, complaint });
  } catch (error) {
    console.error("❌ FULL ERROR STACK:");
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Public (or Private depending on your needs)
export const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get nearby complaints
// @route   GET /api/complaints/nearby
// @access  Public
export const getNearbyComplaints = async (req, res) => {
  try {
    const { longitude, latitude, distance } = req.query;

    const coordinateValidation = validateCoordinates({ longitude, latitude });
    if (coordinateValidation.error) {
      return res.status(400).json({
        success: false,
        message: coordinateValidation.error,
        bounds: coordinateValidation.bounds
      });
    }

    const maxDistance = distance ? Number(distance) : 5000; // default 5km
    if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Distance must be a positive number of meters.'
      });
    }

    const complaints = await Complaint.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [coordinateValidation.longitude, coordinateValidation.latitude]
          },
          $maxDistance: maxDistance
        }
      }
    })
    .sort({ priorityScore: -1, createdAt: -1 })
    .populate('user', 'name');

    res.status(200).json({ 
      success: true, 
      count: complaints.length, 
      radius: `${maxDistance} meters`,
      complaints 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔥 NEW: Get complaints specific to the logged-in Admin's department
// @desc    Get department complaints
// @route   GET /api/complaints/department
// @access  Private/Admin
export const getDepartmentComplaints = async (req, res) => {
  try {
    // SuperAdmins see all. DepartmentAdmins see only their assigned category.
    const filter = req.user.role === 'SuperAdmin' 
      ? {} 
      : { category: req.user.departmentAssigned };

    const complaints = await Complaint.find(filter)
      .sort({ priorityScore: -1, createdAt: -1 }) // Highest priority first
      .populate('user', 'name email');

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin: Update complaint status & upload resolution proof
// @route   PATCH /api/complaints/:id/status
// @access  Private/Admin
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Safely extract properties to prevent undefined crash if Postman sends bad format
    const { status, adminComment } = req.body || {};

    if (!status) {
      return res.status(400).json({ success: false, message: 'Please provide a status update.' });
    }

    // Find the complaint
    let complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // 🔥 NEW: Department Access Control
    // Blocks DepartmentAdmins from fixing issues outside their assigned category
    if (req.user.role === 'DepartmentAdmin' && complaint.category !== req.user.departmentAssigned) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. This issue belongs to the ${complaint.category} department. You are assigned to ${req.user.departmentAssigned}.` 
      });
    }

    const statusError = validateStatusTransition(complaint.status, status);
    if (statusError) {
      return res.status(400).json({ success: false, message: statusError });
    }

    // Update the text fields
    complaint.status = status;
    
    // Safety check: ensure timeline array exists before pushing
    if (adminComment) {
      if (!complaint.timeline) {
        complaint.timeline = [];
      }
      
      complaint.timeline.push({
        status: status,
        note: adminComment,
        updatedBy: req.user._id
      });
    }

    // If the admin uploaded a "proof of fix" image, process it via Cloudinary
    if (req.file) {
      const uploadedImage = await streamUpload(req.file.buffer);
      complaint.resolutionImageUrl = uploadedImage.secure_url;
    }

    // Save changes to DB
    const updatedComplaint = await complaint.save();

    res.status(200).json({ 
      success: true, 
      message: `Complaint marked as ${updatedComplaint.status}`,
      complaint: updatedComplaint 
    });
  } catch (error) {
    console.error("❌ Admin Update Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

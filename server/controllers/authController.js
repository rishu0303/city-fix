import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, departmentAssigned } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ success: false, message: 'User already exists' });

    // 🔥 NEW LOGIC: DepartmentAdmins require approval. Citizens/SuperAdmins do not.
    const isApproved = role === 'DepartmentAdmin' ? false : true;

    const user = await User.create({
      name, email, password, role, departmentAssigned, isApproved
    });

    res.status(201).json({
      success: true,
      message: role === 'DepartmentAdmin' 
        ? 'Registration successful. Your account is pending SuperAdmin approval.' 
        : 'Registration successful.',
      user: { _id: user._id, name: user.name, role: user.role, isApproved: user.isApproved },
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      
      // 🔥 NEW LOGIC: Block login if DepartmentAdmin is not yet approved
      if (user.role === 'DepartmentAdmin' && !user.isApproved) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access Denied: Your account is pending SuperAdmin approval.' 
        });
      }

      res.json({
        success: true,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or Deny a DepartmentAdmin (SuperAdmin only)
// @route   PATCH /api/auth/users/:id/approve
export const approveAdmin = async (req, res) => {
  try {
    const { isApproved } = req.body; // Expecting boolean true/false
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'DepartmentAdmin') {
      return res.status(400).json({ success: false, message: 'Only DepartmentAdmins require approval.' });
    }

    user.isApproved = isApproved;
    const updatedUser = await user.save();

    res.json({
      success: true,
      message: isApproved ? `User ${updatedUser.name} has been approved!` : `User ${updatedUser.name} access revoked.`,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        role: updatedUser.role,
        isApproved: updatedUser.isApproved
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
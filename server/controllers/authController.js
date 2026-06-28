import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const DEPARTMENTS = ['Roads', 'Electrical', 'Sanitation', 'Water', 'General'];
const MIN_PASSWORD_LENGTH = 8;

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// @desc    Register new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, departmentAssigned } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const plainPassword = typeof password === 'string' ? password : '';
    const requestedRole = role === 'DepartmentAdmin' ? 'DepartmentAdmin' : 'Citizen';

    if (!normalizedName) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'A valid email is required.' });
    }

    if (plainPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
      });
    }

    if (requestedRole === 'DepartmentAdmin' && !DEPARTMENTS.includes(departmentAssigned)) {
      return res.status(400).json({
        success: false,
        message: `DepartmentAdmin registration requires a valid department: ${DEPARTMENTS.join(', ')}.`
      });
    }
    
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) return res.status(400).json({ success: false, message: 'User already exists' });

    // Public registration must never create privileged SuperAdmin accounts.
    const isApproved = requestedRole === 'DepartmentAdmin' ? false : true;

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: plainPassword,
      role: requestedRole,
      departmentAssigned: requestedRole === 'DepartmentAdmin' ? departmentAssigned : undefined,
      isApproved
    });

    res.status(201).json({
      success: true,
      message: requestedRole === 'DepartmentAdmin' 
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
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await User.findOne({ email: normalizedEmail });

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
    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isApproved must be a boolean value.'
      });
    }

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

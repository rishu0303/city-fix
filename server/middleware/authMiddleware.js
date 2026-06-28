import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 1. Protect routes - Verify JWT Token
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token and exclude password
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      return next(); 
    } catch (error) {
      console.error('Auth Error:', error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// 2. Role-based authorization (Dynamic)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `User role '${req.user?.role || 'Guest'}' is not authorized to access this route` 
      });
    }
    return next();
  };
};

// 3. Admin authorization middleware (With Approval check)
export const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'DepartmentAdmin' || req.user.role === 'SuperAdmin')) {
    
    // Strict approval check for DepartmentAdmins
    if (req.user.role === 'DepartmentAdmin' && req.user.isApproved !== true) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Your account is pending SuperAdmin approval.' 
      });
    }
    
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as an admin. Access denied.'
    });
  }
};

// 4. SuperAdmin authorization middleware (Strict)
export const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SuperAdmin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized. SuperAdmin access required.'
    });
  }
};
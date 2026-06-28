import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['Citizen', 'DepartmentAdmin', 'SuperAdmin'],
    default: 'Citizen'
  },
  departmentAssigned: {
    type: String,
    enum: ['Roads', 'Electrical', 'Sanitation', 'Water', 'General'],
    // Required only if the user is a DepartmentAdmin
    required: function() { return this.role === 'DepartmentAdmin'; }
  },
  // NEW: Track if the SuperAdmin has approved this worker's account
  isApproved: { type: Boolean, default: true },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Middleware: Hash password before saving to the database
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method: Compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);